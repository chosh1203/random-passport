import { OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Airport, ResolvedDestination } from '../data/types'
import { buildFlightCurve, latLonToVector3, slerpUnit } from '../lib/geo'
import { Earth, OrbitRings } from './Earth'

export type FlightPhase = 'idle' | 'selecting' | 'revealed' | 'flying' | 'arrived'

export interface GlobeSceneProps {
  phase: FlightPhase
  origin: Airport
  destination: ResolvedDestination | null
  /** Unique per journey; remounts flight state even for a repeated city */
  journeyId: string | null
  reducedMotion: boolean
  skipToken: number
  /** Push the globe to the right half (desktop hero layout) */
  shiftRight: boolean
  onReady?: (state: 'ready' | 'error') => void
  onArcReady?: () => void
  onProgress?: (p: number) => void
  onArrive?: () => void
}

const FLIGHT_SECONDS = 6
const ARC_SECONDS = 1.3

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Crisp text label drawn to a canvas — no DOM portals inside the WebGL scene */
function makeLabelTexture(code: string, sub: string) {
  const c = document.createElement('canvas')
  const W = 512
  const H = 200
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.shadowColor = 'rgba(50,157,255,0.95)'
  g.shadowBlur = 18
  g.fillStyle = '#f4f8ff'
  g.font = '600 76px Cinzel, "Cormorant Garamond", Georgia, serif'
  g.fillText(code, W / 2, 78)
  g.shadowBlur = 8
  g.shadowColor = 'rgba(0,0,0,0.9)'
  g.fillStyle = '#a5bbd3'
  g.font = '500 40px "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'
  g.fillText(`(${sub})`, W / 2, 150)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/* ------------------------------------------------------------------ */
/* Airport marker                                                      */
/* ------------------------------------------------------------------ */
function AirportMarker({
  lat,
  lon,
  code,
  label,
  color = '#78d7ff',
  emphasis = 0,
  appear = true,
}: {
  lat: number
  lon: number
  code: string
  label: string
  color?: string
  /** 0 = normal, 1 = arrival glow */
  emphasis?: number
  appear?: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const labelRef = useRef<THREE.Sprite>(null)
  const [fontsReady, setFontsReady] = useState(false)
  useEffect(() => {
    document.fonts?.ready.then(() => setFontsReady(true))
  }, [])
  const labelTex = useMemo(() => makeLabelTexture(code, label), [code, label, fontsReady])
  useEffect(() => () => labelTex.dispose(), [labelTex])
  const scaleRef = useRef(appear ? 1 : 0)
  const { camera } = useThree()

  const { position, quaternion } = useMemo(() => {
    const p = latLonToVector3(lat, lon, 1.002)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize())
    return { position: p, quaternion: q }
  }, [lat, lon])

  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime()
    scaleRef.current = THREE.MathUtils.damp(scaleRef.current, appear ? 1 : 0, 6, dt)
    const s = scaleRef.current
    if (group.current) group.current.scale.setScalar(Math.max(s, 0.0001))
    const pulse = (t * 0.8) % 1
    if (ring.current) {
      ring.current.scale.setScalar(1 + pulse * (2.2 + emphasis * 2))
      ;(ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - pulse) * (0.7 + emphasis * 0.3)
    }
    if (ring2.current) {
      const p2 = ((t * 0.8) + 0.5) % 1
      ring2.current.scale.setScalar(1 + p2 * (2.2 + emphasis * 2))
      ;(ring2.current.material as THREE.MeshBasicMaterial).opacity = (1 - p2) * 0.45 * (0.4 + emphasis)
    }
    if (halo.current) {
      const m = halo.current.material as THREE.MeshBasicMaterial
      m.opacity = 0.35 + emphasis * 0.45 + Math.sin(t * 3) * 0.08 * (1 + emphasis)
      halo.current.scale.setScalar(1 + emphasis * 0.8)
    }
    // Hide labels on the far side of the globe
    if (labelRef.current) {
      tmp.copy(camera.position).normalize()
      const facing = position.clone().normalize().dot(tmp)
      const vis = THREE.MathUtils.clamp((facing - 0.12) * 5, 0, 1) * s
      ;(labelRef.current.material as THREE.SpriteMaterial).opacity = vis
    }
  })

  return (
    <group position={position} quaternion={quaternion}>
      <group ref={group}>
        <mesh>
          <circleGeometry args={[0.012, 24]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh ref={halo}>
          <circleGeometry args={[0.03, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh ref={ring}>
          <ringGeometry args={[0.028, 0.033, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        <mesh ref={ring2}>
          <ringGeometry args={[0.028, 0.031, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
        {/* Beacon */}
        <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0015, 0.0015, 0.09, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} />
        </mesh>
      </group>
      <sprite ref={labelRef} position={[0, 0, 0.16]} scale={[0.32, 0.125, 1]} renderOrder={10}>
        <spriteMaterial map={labelTex} transparent opacity={0} depthWrite={false} depthTest={false} />
      </sprite>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Airplane model (built from primitives — no external asset needed)  */
/* ------------------------------------------------------------------ */
function AirplaneModel() {
  const body = <meshStandardMaterial color="#f4f8ff" metalness={0.35} roughness={0.35} emissive="#2a6fd6" emissiveIntensity={0.35} />
  return (
    <group scale={1.05}>
      {/* fuselage (nose → +Z) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.0085, 0.062, 6, 12]} />
        {body}
      </mesh>
      {/* main wings */}
      <mesh position={[0, -0.001, 0.004]}>
        <boxGeometry args={[0.092, 0.0022, 0.018]} />
        {body}
      </mesh>
      <mesh position={[0.03, -0.001, -0.002]} rotation={[0, 0.45, 0]}>
        <boxGeometry args={[0.04, 0.0022, 0.014]} />
        {body}
      </mesh>
      <mesh position={[-0.03, -0.001, -0.002]} rotation={[0, -0.45, 0]}>
        <boxGeometry args={[0.04, 0.0022, 0.014]} />
        {body}
      </mesh>
      {/* tailplane */}
      <mesh position={[0, 0, -0.036]}>
        <boxGeometry args={[0.034, 0.0018, 0.01]} />
        {body}
      </mesh>
      {/* fin */}
      <mesh position={[0, 0.011, -0.037]}>
        <boxGeometry args={[0.0018, 0.02, 0.012]} />
        {body}
      </mesh>
      {/* engine glow */}
      <mesh position={[0, 0, -0.05]}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial color="#78d7ff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight color="#78d7ff" intensity={0.6} distance={0.4} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Flight: arc + glowing trail + plane + camera autopilot             */
/* ------------------------------------------------------------------ */
const trailVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const trailFragment = /* glsl */ `
  uniform float progress;
  uniform vec3 colorA;
  uniform vec3 colorB;
  varying vec2 vUv;
  void main() {
    float d = progress - vUv.x;
    if (d < 0.0 || progress <= 0.0) discard;
    float head = exp(-d * 9.0);
    float alpha = 0.32 + 0.68 * head;
    vec3 col = mix(colorA, colorB, head);
    gl_FragColor = vec4(col, alpha);
  }
`

function Flight({
  origin,
  destination,
  phase,
  reducedMotion,
  skipToken,
  onArcReady,
  onProgress,
  onArrive,
}: Pick<GlobeSceneProps, 'origin' | 'phase' | 'reducedMotion' | 'skipToken' | 'onArcReady' | 'onProgress' | 'onArrive'> & { destination: ResolvedDestination }) {
  const { curve, segments } = useMemo(() => {
    const segments = 220
    const { curve } = buildFlightCurve(origin.latitude, origin.longitude, destination.airportLatitude, destination.airportLongitude, segments)
    return { curve, segments }
  }, [origin, destination])

  const lineGeom = useMemo(() => new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(segments)), [curve, segments])
  const tubeGeom = useMemo(() => new THREE.TubeGeometry(curve, segments, 0.0055, 8, false), [curve, segments])
  const glowGeom = useMemo(() => new THREE.TubeGeometry(curve, segments, 0.016, 8, false), [curve, segments])
  const trailMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { progress: { value: 0 }, colorA: { value: new THREE.Color('#329dff') }, colorB: { value: new THREE.Color('#e8fbff') } },
        vertexShader: trailVertex,
        fragmentShader: trailFragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  const glowMat = useMemo(() => {
    const m = trailMat.clone()
    m.uniforms = { progress: { value: 0 }, colorA: { value: new THREE.Color('#0d4f9e') }, colorB: { value: new THREE.Color('#329dff') } }
    return m
  }, [trailMat])

  useEffect(() => () => {
    lineGeom.dispose()
    tubeGeom.dispose()
    glowGeom.dispose()
  }, [lineGeom, tubeGeom, glowGeom])

  const lineRef = useRef<THREE.Line>(null)
  const plane = useRef<THREE.Group>(null)
  const st = useRef({ arc: 0, t: 0, arcDone: false, arrived: false, lastProgressEmit: -1 })

  // reset per journey
  useEffect(() => {
    st.current = { arc: 0, t: 0, arcDone: false, arrived: false, lastProgressEmit: -1 }
  }, [destination])

  // skip
  const lastSkip = useRef(skipToken)
  useEffect(() => {
    if (skipToken !== lastSkip.current) {
      lastSkip.current = skipToken
      st.current.arc = 1
      st.current.t = 1
    }
  }, [skipToken])

  const pos = useMemo(() => new THREE.Vector3(), [])
  const tan = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const m4 = useMemo(() => new THREE.Matrix4(), [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.2)
    const s = st.current
    const arcDur = reducedMotion ? 0.01 : ARC_SECONDS
    const flyDur = reducedMotion ? 1.2 : FLIGHT_SECONDS

    if (phase === 'revealed' || phase === 'flying' || phase === 'arrived') {
      s.arc = Math.min(1, s.arc + dt / arcDur)
      if (s.arc >= 1 && !s.arcDone) {
        s.arcDone = true
        onArcReady?.()
      }
    }
    if (phase === 'flying') s.t = Math.min(1, s.t + dt / flyDur)
    if (phase === 'arrived') s.t = 1

    if (lineRef.current) lineRef.current.geometry.setDrawRange(0, Math.floor(easeInOut(s.arc) * (segments + 1)))

    const eased = easeInOut(s.t)
    trailMat.uniforms.progress.value = phase === 'flying' || phase === 'arrived' ? eased : 0
    glowMat.uniforms.progress.value = trailMat.uniforms.progress.value

    if (plane.current) {
      const visible = phase === 'flying' || phase === 'arrived'
      plane.current.visible = visible
      if (visible) {
        const u = THREE.MathUtils.clamp(eased, 0.0005, 0.9995)
        curve.getPointAt(u, pos)
        curve.getTangentAt(u, tan).normalize()
        up.copy(pos).normalize()
        right.crossVectors(up, tan).normalize()
        up.crossVectors(tan, right).normalize()
        m4.makeBasis(right, up, tan)
        plane.current.position.copy(pos).addScaledVector(up, 0.006)
        plane.current.quaternion.setFromRotationMatrix(m4)
        // bank slightly into the arc's descent for life
        const scale = phase === 'arrived' ? THREE.MathUtils.damp(plane.current.scale.x, 0.75, 4, dt) : 1
        plane.current.scale.setScalar(scale)
      }
    }

    if (phase === 'flying') {
      if (Math.abs(s.t - s.lastProgressEmit) > 0.004 || s.t === 1) {
        s.lastProgressEmit = s.t
        onProgress?.(s.t)
      }
      if (s.t >= 1 && !s.arrived) {
        s.arrived = true
        onArrive?.()
      }
    }
  })

  return (
    <group>
      <primitive
        object={useMemo(() => {
          const l = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ color: '#7cc8ff', transparent: true, opacity: 0.85 }))
          return l
        }, [lineGeom])}
        ref={lineRef}
      />
      <mesh geometry={glowGeom} material={glowMat} />
      <mesh geometry={tubeGeom} material={trailMat} />
      <group ref={plane} visible={false}>
        <AirplaneModel />
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Camera: auto-rotate when idle, autopilot during flight             */
/* ------------------------------------------------------------------ */
function CameraRig({
  phase,
  origin,
  destination,
  reducedMotion,
  shiftRight,
}: Pick<GlobeSceneProps, 'phase' | 'origin' | 'destination' | 'reducedMotion' | 'shiftRight'>) {
  const controls = useRef<OrbitControlsImpl>(null)
  const { camera, size } = useThree()
  const interacting = useRef(false)
  const resumeTimer = useRef<number | undefined>(undefined)
  const userTookOver = useRef(false)
  const flightT = useRef(0)

  useEffect(() => {
    if (phase === 'revealed') {
      userTookOver.current = false
      flightT.current = 0
    }
  }, [phase])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    const start = () => {
      interacting.current = true
      userTookOver.current = true
      window.clearTimeout(resumeTimer.current)
    }
    const end = () => {
      window.clearTimeout(resumeTimer.current)
      resumeTimer.current = window.setTimeout(() => (interacting.current = false), 3000)
    }
    c.addEventListener('start', start)
    c.addEventListener('end', end)
    return () => {
      c.removeEventListener('start', start)
      c.removeEventListener('end', end)
    }
  }, [])

  const aspect = size.width / Math.max(size.height, 1)
  const baseDist = Math.max(4.15, 1.32 / (Math.tan(THREE.MathUtils.degToRad(19)) * aspect))

  const target = useMemo(() => new THREE.Vector3(), [])
  const dir = useMemo(() => new THREE.Vector3(), [])
  const camDir = useMemo(() => new THREE.Vector3(), [])

  const originV = useMemo(() => latLonToVector3(origin.latitude, origin.longitude).normalize(), [origin])
  const destV = useMemo(
    () => (destination ? latLonToVector3(destination.airportLatitude, destination.airportLongitude).normalize() : null),
    [destination],
  )

  // initial camera — looking at East Asia
  useEffect(() => {
    camera.position.copy(latLonToVector3(28, 112, baseDist))
    camera.lookAt(0, 0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.2)
    const c = controls.current
    const cam = camera as THREE.PerspectiveCamera
    if (!c) return

    const flying = phase === 'revealed' || phase === 'flying'
    const autopilot = flying || (phase === 'arrived' && !userTookOver.current)
    c.enabled = !flying
    c.autoRotate = !reducedMotion && !interacting.current && (phase === 'idle' || phase === 'selecting')
    c.autoRotateSpeed = phase === 'selecting' ? 6 : 0.35

    // horizontal framing (desktop hero pushes globe right)
    const targetOffset = shiftRight && phase === 'idle' ? -7.5 : 0
    const nextOffset = reducedMotion ? targetOffset : THREE.MathUtils.damp(cam.filmOffset, targetOffset, 2.5, dt)
    if (Math.abs(nextOffset - cam.filmOffset) > 0.001) {
      cam.filmOffset = nextOffset
      cam.updateProjectionMatrix()
    }

    if (autopilot && destV) {
      if (phase === 'flying') flightT.current = Math.min(1, flightT.current + dt / (reducedMotion ? 1.2 : FLIGHT_SECONDS))
      else if (phase === 'revealed') flightT.current = 0
      else flightT.current = 1

      // Look between origin and destination, drifting with the plane
      const follow = phase === 'arrived' ? 1 : 0.5 + 0.5 * easeInOut(flightT.current) * 0.9
      slerpUnit(originV, destV, follow, dir).normalize()
      // lift the viewpoint a little toward the north for a nicer horizon
      dir.y += 0.12
      dir.normalize()
      const dist = phase === 'arrived' ? baseDist * 0.82 : baseDist * 0.95
      target.copy(dir).multiplyScalar(dist)

      if (reducedMotion) {
        camera.position.copy(target)
      } else {
        // move along the sphere (not through it)
        camDir.copy(camera.position).normalize()
        const k = 1 - Math.exp(-dt * (phase === 'revealed' ? 2.2 : 1.6))
        slerpUnit(camDir, dir, k, camDir).normalize()
        const r = THREE.MathUtils.damp(camera.position.length(), dist, 2, dt)
        camera.position.copy(camDir.multiplyScalar(r))
      }
      camera.lookAt(0, 0, 0)
    }
    c.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      minDistance={1.55}
      maxDistance={9}
    />
  )
}

/* ------------------------------------------------------------------ */
/* Scene                                                               */
/* ------------------------------------------------------------------ */
export default function GlobeScene(props: GlobeSceneProps) {
  const { phase, origin, destination, journeyId, reducedMotion, skipToken, shiftRight, onReady, onArcReady, onProgress, onArrive } = props
  const showDest = !!destination && (phase === 'revealed' || phase === 'flying' || phase === 'arrived')
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 38, near: 0.05, far: 200, position: [0, 0, 4.2] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ touchAction: 'none' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 4]} intensity={1.4} />
      <Stars radius={60} depth={40} count={reducedMotion ? 2000 : 4000} factor={3} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />
      {!reducedMotion && <Sparkles count={70} scale={3.6} size={1.6} speed={0.25} opacity={0.35} color="#78d7ff" />}
      <OrbitRings />
      <Earth onReady={onReady} />
      <AirportMarker lat={origin.latitude} lon={origin.longitude} code={origin.iata} label="인천" color="#78d7ff" />
      {destination && (
        <AirportMarker
          key={'m-' + (journeyId ?? destination.id)}
          lat={destination.airportLatitude}
          lon={destination.airportLongitude}
          code={destination.iataCode}
          label={destination.cityKo}
          color="#329dff"
          appear={showDest}
          emphasis={phase === 'arrived' ? 1 : 0}
        />
      )}
      {destination && showDest && (
        <Flight
          key={'f-' + (journeyId ?? destination.id)}
          origin={origin}
          destination={destination}
          phase={phase}
          reducedMotion={reducedMotion}
          skipToken={skipToken}
          onArcReady={onArcReady}
          onProgress={onProgress}
          onArrive={onArrive}
        />
      )}
      <CameraRig phase={phase} origin={origin} destination={destination} reducedMotion={reducedMotion} shiftRight={shiftRight} />
    </Canvas>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GLOBE_RADIUS } from '../lib/geo'
import { asset } from '../components/ui'

/* --------------------------------------------------------------------------
 * Earth surface: day map + city-lights map blended across a terminator that
 * is fixed in view space (so the visible face always shows both sides).
 * If textures fail to load, a procedural navy globe with a lat/lon grid
 * is shown instead — the scene never goes blank.
 * ------------------------------------------------------------------------ */

const earthVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewPos;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`

const earthFragment = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D bumpMap;
  uniform vec3 sunDir;
  uniform float useTex;
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewPos;

  float gridLine(float v, float step, float w) {
    float f = abs(fract(v / step + 0.5) - 0.5) * step;
    return 1.0 - smoothstep(0.0, w, f);
  }

  void main() {
    vec3 n = normalize(vNormalView);
    vec3 viewDir = normalize(-vViewPos);
    float ndl = dot(n, normalize(sunDir));
    float dayMix = smoothstep(-0.18, 0.38, ndl);
    float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.6);

    vec3 color;
    if (useTex > 0.5) {
      vec3 day = texture2D(dayMap, vUv).rgb;
      vec3 night = texture2D(nightMap, vUv).rgb;
      float h = texture2D(bumpMap, vUv).r;
      // Cool, slightly desaturated day side to fit the navy UI
      float lum = dot(day, vec3(0.299, 0.587, 0.114));
      vec3 dayCool = mix(vec3(lum), day, 0.75) * vec3(0.78, 0.9, 1.12);
      vec3 dayLit = dayCool * (0.18 + 1.05 * max(ndl, 0.0)) + h * 0.05;
      // Night: faint blue landmass + warm city lights
      vec3 nightSide = day * vec3(0.05, 0.09, 0.17) + pow(night, vec3(1.25)) * vec3(1.35, 1.05, 0.7) * 1.25;
      color = mix(nightSide, dayLit, dayMix);
    } else {
      // Procedural fallback
      vec3 base = mix(vec3(0.02, 0.06, 0.12), vec3(0.05, 0.16, 0.3), dayMix);
      float lat = (vUv.y - 0.5) * 180.0;
      float lon = (vUv.x - 0.5) * 360.0;
      float g = max(gridLine(lat, 15.0, 0.35), gridLine(lon, 15.0, 0.35));
      color = base + g * vec3(0.12, 0.35, 0.65) * 0.6;
    }

    color += vec3(0.16, 0.48, 1.0) * rim * 0.6;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vPos = mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`
const atmosphereFragment = /* glsl */ `
  uniform vec3 glowColor;
  varying vec3 vNormal;
  varying vec3 vPos;
  void main() {
    vec3 viewDir = normalize(-vPos);
    // back faces: -dot grows from 0 at the outer rim toward the planet edge
    float d = clamp(-dot(vNormal, viewDir), 0.0, 1.0);
    float intensity = pow(d / 0.5, 2.2);
    gl_FragColor = vec4(glowColor * 1.1, intensity);
  }
`

type TexState = 'loading' | 'ready' | 'error'

export function Earth({ onReady, earthRef }: { onReady?: (state: Exclude<TexState, 'loading'>) => void; earthRef?: React.RefObject<THREE.Mesh | null> }) {
  const [textures, setTextures] = useState<{ day: THREE.Texture; night: THREE.Texture; bump: THREE.Texture } | null>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    let alive = true
    const loader = new THREE.TextureLoader()
    const load = (url: string) =>
      new Promise<THREE.Texture>((res, rej) => loader.load(url, res, undefined, rej))
    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000))
    Promise.race([Promise.all([load(asset('textures/earth-day.jpg')), load(asset('textures/earth-night.jpg')), load(asset('textures/earth-bump.png'))]), timeout])
      .then(([day, night, bump]) => {
        if (!alive) return
        ;[day, night].forEach((t) => {
          t.colorSpace = THREE.SRGBColorSpace
          t.anisotropy = 8
        })
        setTextures({ day, night, bump })
        onReadyRef.current?.('ready')
      })
      .catch(() => {
        if (!alive) return
        onReadyRef.current?.('error')
      })
    return () => {
      alive = false
    }
  }, [])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: null },
          nightMap: { value: null },
          bumpMap: { value: null },
          sunDir: { value: new THREE.Vector3(0.95, 0.38, 0.2) },
          useTex: { value: 0 },
        },
        vertexShader: earthVertex,
        fragmentShader: earthFragment,
      }),
    [],
  )

  useEffect(() => {
    if (textures) {
      material.uniforms.dayMap.value = textures.day
      material.uniforms.nightMap.value = textures.night
      material.uniforms.bumpMap.value = textures.bump
      material.uniforms.useTex.value = 1
    }
  }, [textures, material])

  const atmosphere = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color('#3a9dff') } },
        vertexShader: atmosphereVertex,
        fragmentShader: atmosphereFragment,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  )

  return (
    <group>
      <mesh ref={earthRef} material={material} name="earth">
        <sphereGeometry args={[GLOBE_RADIUS, 128, 96]} />
      </mesh>
      <mesh material={atmosphere} scale={1.15}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 48]} />
      </mesh>
    </group>
  )
}

/** Thin decorative orbit rings, like an observatory HUD */
export function OrbitRings() {
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.02
  })
  const ring = (r: number) => {
    const pts = Array.from({ length: 257 }, (_, i) => {
      const a = (i / 256) * Math.PI * 2
      return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)
    })
    return new THREE.BufferGeometry().setFromPoints(pts)
  }
  const g1 = useMemo(() => ring(1.42), [])
  const g2 = useMemo(() => ring(1.62), [])
  return (
    <group ref={ref} rotation={[0.42, 0, -0.28]}>
      <lineLoop geometry={g1}>
        <lineBasicMaterial color="#329dff" transparent opacity={0.13} />
      </lineLoop>
      <lineLoop geometry={g2}>
        <lineBasicMaterial color="#78d7ff" transparent opacity={0.06} />
      </lineLoop>
    </group>
  )
}

import * as THREE from "three"
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js"
import { siClaude, siNextdotjs, siReact, siTypescript, siWordpress } from "simple-icons"
import type { HeroKeyId } from "@/components/hero-scene-layout"

/**
 * Logos das tecnologias impressos nas teclas da hero: no lugar da legenda
 * em relevo do GLB entra um desenho sem espessura que acompanha a concha da
 * tampa (cada vértice desce até a superfície), como uma serigrafia.
 */
const LOGOS: Record<HeroKeyId, string> = {
  cmd: siNextdotjs.path,
  k: siReact.path,
  brackets: siTypescript.path,
  slash: siWordpress.path,
  enter: siClaude.path,
}

/** Quanto do lado da tampa o logo ocupa (a legenda original é menor). */
const FILL = 0.5
/** Folga acima da tampa (m): o bastante para não piscar contra ela. */
const LIFT = 0.00006

const cache = new Map<string, THREE.BufferGeometry>()

/**
 * Geometria do logo no espaço local da legenda (`legend`, filha de `body`):
 * centrada nela, com o lado maior em `FILL` do lado da tecla (`keySize`) e
 * cada vértice pousado na superfície da tampa.
 */
export function logoGeometry(
  id: HeroKeyId,
  legend: THREE.Mesh,
  body: THREE.BufferGeometry,
  keySize: number,
) {
  const hit = cache.get(id)
  if (hit) return hit

  legend.geometry.computeBoundingBox()
  const box = legend.geometry.boundingBox!
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  // Formas do SVG (24×24, y para baixo) num plano só
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${LOGOS[id]}"/></svg>`)
  const parts = data.paths.flatMap((p) =>
    SVGLoader.createShapes(p).map((s) => new THREE.ShapeGeometry(s, 12)),
  )
  const geo = mergeGeometries(parts)!
  parts.forEach((g) => g.dispose())

  // Centra, desvira o y do SVG e escala para o tamanho certo
  geo.computeBoundingBox()
  const lb = geo.boundingBox!
  const ls = lb.getSize(new THREE.Vector3())
  const lc = lb.getCenter(new THREE.Vector3())
  const k = (keySize * FILL) / Math.max(ls.x, ls.y)
  geo.translate(-lc.x, -lc.y, 0)
  geo.scale(k, -k, 1)

  // Deita no plano da legenda: a espessura dela é o eixo "para cima"
  const up = size.x < size.y && size.x < size.z ? "x" : size.y < size.z ? "y" : "z"
  if (up === "y") geo.rotateX(-Math.PI / 2)
  else if (up === "x") geo.rotateY(Math.PI / 2)
  geo.translate(
    up === "x" ? box.max.x : center.x,
    up === "y" ? box.max.y : center.y,
    up === "z" ? box.max.z : center.z,
  )
  conform(geo, legend, body, up)
  geo.computeVertexNormals()
  cache.set(id, geo)
  return geo
}

/**
 * Desce cada vértice até a tampa (raio de cima para baixo no espaço do
 * corpo). A concha é côncava: entre dois vértices pousados o triângulo fica
 * acima dela, então não precisa subdividir.
 */
function conform(
  geo: THREE.BufferGeometry,
  legend: THREE.Mesh,
  body: THREE.BufferGeometry,
  up: "x" | "y" | "z",
) {
  const m = new THREE.Matrix4().compose(legend.position, legend.quaternion, legend.scale)
  const inv = m.clone().invert()
  const axis = new THREE.Vector3(up === "x" ? 1 : 0, up === "y" ? 1 : 0, up === "z" ? 1 : 0)
  const dir = axis.clone().transformDirection(m)
  // "Para cima" é do centro do corpo para o centro do desenho da legenda
  // (o nó da legenda fica na origem da tecla: a posição dele não serve)
  body.computeBoundingBox()
  const toLegend = legend.geometry
    .boundingBox!.getCenter(new THREE.Vector3())
    .applyMatrix4(m)
    .sub(body.boundingBox!.getCenter(new THREE.Vector3()))
  if (toLegend.dot(dir) < 0) dir.negate()

  const target = new THREE.Mesh(body, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))
  const ray = new THREE.Raycaster()
  const hits: THREE.Intersection[] = []
  const pos = geo.attributes.position
  const p = new THREE.Vector3()
  const down = dir.clone().negate()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(m)
    ray.set(p.clone().addScaledVector(dir, 0.02), down)
    hits.length = 0
    target.raycast(ray, hits)
    if (!hits.length) continue
    hits.sort((a, b) => a.distance - b.distance)
    p.copy(hits[0].point).addScaledVector(dir, LIFT).applyMatrix4(inv)
    pos.setXYZ(i, p.x, p.y, p.z)
  }
  pos.needsUpdate = true
  ;(target.material as THREE.Material).dispose()
}

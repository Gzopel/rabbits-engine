const sqr = (x) => { return x * x; };

export const vectorDistanceToVector = (v, w) => { return Math.sqrt(sqr(v.x - w.x) + sqr(v.z - w.z)); };

export const dotProduct = (v, w) => { return v.x * w.x + v.z * w.z };

export const crossProduct = (v, w) => ({ x: v.x * w.z, z: v.z * w.x });

export const vectorNorm = (v) => { return Math.sqrt(sqr(v.x) + sqr(v.z)); };

export const vectorSub = (v, w) => ({ x: v.x - w.x, z: v.z - w.z });

export const vectorAdd = (v, w) => ({ x: v.x + w.x, z: v.z + w.z });

export const vectorInvert = (v) => ({ x: -v.x, z: -v.z });

export const mutiplyVectorFromScalar = (v, s) => ({ x: v.x * s, z: v.z * s });

export const distanceToVector = (p, v, w) => {
  const t = vectorSub(w, v);
  const s = vectorSub(p, v);
  const dot = dotProduct(s, t);
  const normT = vectorNorm(t);
  const d = dot / sqr(normT);
  return vectorNorm(vectorSub(s, mutiplyVectorFromScalar(t, d)));
}

export const noramilzeVector = (v) => {
  const n = vectorNorm(v);
  return { x: v.x / n, z: v.z / n };
};

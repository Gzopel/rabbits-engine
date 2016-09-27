export const sqr = (x) => { return x * x; };

export const dist2 = (v, w) => { return sqr(v.x - w.x) + sqr(v.z - w.z); };

export const vectorSub = (v, w) => ({ x: v.x - w.x, z: v.z - w.z });

export const noramilzeVector = (v) => {
  const sum = v.x + v.z;
  return { x: v.x / sum, z: v.z / sum };
};

export const mutiplyVectorFromScalar = (v, s) => ({ x: v.x * s, z: v.z * s });
import type * as tfType from '@tensorflow/tfjs'

export type Distribution = 'gaussian' | 'ring' | 'spiral' | 'grid' | 'circle' | 'moons'

export function sampleNoise(n: number, tf: typeof tfType) {
  return tf.randomNormal([n, 2])
}

export function sampleReal(n: number, dist: Distribution, tf: typeof tfType) {
  switch (dist) {
    case 'gaussian':
      return tf.add(tf.randomNormal([n, 2], 0.5, 0.12), 0)
    case 'ring': {
      const r = tf.add(tf.randomNormal([n, 1], 0.4, 0.05).abs(), 0)
      const theta = tf.randomUniform([n, 1], 0, Math.PI * 2)
      const x = tf.mul(r, tf.cos(theta))
      const y = tf.mul(r, tf.sin(theta))
      return tf.concat([x.add(0.5), y.add(0.5)], 1)
    }
    case 'spiral': {
      const t = tf.randomUniform([n, 1], 0, 4 * Math.PI)
      const r = tf.mul(0.1, t)
      const x = tf.add(tf.mul(r, tf.cos(t)), 0.5)
      const y = tf.add(tf.mul(r, tf.sin(t)), 0.5)
      return tf.concat([x, y], 1)
    }
    case 'grid': {
      const s = Math.ceil(Math.sqrt(n))
      const xs: number[] = []
      for (let i = 0; i < n; i++) {
        const xi = i % s
        const yi = Math.floor(i / s)
        xs.push(xi / (s - 1), yi / (s - 1))
      }
      return tf.tensor2d(xs, [n, 2])
    }
    case 'circle': {
      const theta = tf.randomUniform([n, 1], 0, Math.PI * 2)
      const r = tf.fill([n, 1], 0.35)
      const x = tf.add(tf.mul(r, tf.cos(theta)), 0.5)
      const y = tf.add(tf.mul(r, tf.sin(theta)), 0.5)
      return tf.concat([x, y], 1)
    }
    case 'moons': {
      // 两个交错的半月牙
      const half = Math.floor(n / 2)
      const t1 = tf.randomUniform([half, 1], 0, Math.PI)
      const m1 = tf.concat(
        [tf.add(tf.mul(tf.cos(t1), 0.35), 0.35), tf.add(tf.mul(tf.sin(t1), 0.35), 0.4)],
        1,
      )
      const t2 = tf.randomUniform([n - half, 1], 0, Math.PI)
      const m2 = tf.concat(
        [tf.add(tf.neg(tf.mul(tf.cos(t2), 0.35)), 0.65), tf.add(tf.neg(tf.mul(tf.sin(t2), 0.35)), 0.6)],
        1,
      )
      return tf.concat([m1, m2], 0)
    }
    default:
      return tf.add(tf.randomNormal([n, 2], 0.5, 0.12), 0)
  }
}

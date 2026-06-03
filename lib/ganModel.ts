import type * as tfType from '@tensorflow/tfjs'

export function createGenerator(tf: typeof tfType) {
  const gen = tf.sequential()
  gen.add(tf.layers.dense({ units: 32, inputShape: [2], activation: 'tanh' }))
  gen.add(tf.layers.dense({ units: 32, activation: 'tanh' }))
  gen.add(tf.layers.dense({ units: 2 }))
  return gen
}

export function createDiscriminator(tf: typeof tfType) {
  const dis = tf.sequential()
  dis.add(tf.layers.dense({ units: 32, inputShape: [2], activation: 'relu' }))
  dis.add(tf.layers.dense({ units: 16, activation: 'relu' }))
  dis.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }))
  return dis
}

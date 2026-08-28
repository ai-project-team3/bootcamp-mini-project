function shuffleIndexes(itemCount, random) {
  const indexes = Array.from({ length: itemCount }, (_, index) => index)

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1))
    ;[indexes[index], indexes[randomIndex]] = [indexes[randomIndex], indexes[index]]
  }

  return indexes
}

export function drawNextPrompt(session, itemCount, random = Math.random) {
  if (itemCount < 1) {
    return { queue: [], currentIndex: null }
  }

  const queue = session.queue.length > 0
    ? [...session.queue]
    : shuffleIndexes(itemCount, random)

  if (queue.length > 1 && queue[0] === session.currentIndex) {
    ;[queue[0], queue[1]] = [queue[1], queue[0]]
  }

  return {
    currentIndex: queue.shift(),
    queue,
  }
}

interface DocumentAnimationCoordinator {
  tail: Promise<void>
}

const documentCoordinators = new WeakMap<Document, DocumentAnimationCoordinator>()

export function createAbortError(message = 'The dock window operation was aborted') {
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

export function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted)
    throw createAbortError()
}

export function enqueueDocumentAnimation<T>(
  ownerDocument: Document,
  signal: AbortSignal,
  task: () => Promise<T>,
) {
  let coordinator = documentCoordinators.get(ownerDocument)
  if (!coordinator) {
    coordinator = { tail: Promise.resolve() }
    documentCoordinators.set(ownerDocument, coordinator)
  }

  const run = async () => {
    throwIfAborted(signal)
    return task()
  }
  const result = coordinator.tail.then(run, run)
  coordinator.tail = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

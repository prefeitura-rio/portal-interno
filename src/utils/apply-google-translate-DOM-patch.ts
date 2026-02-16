// utils/applyGoogleTranslateDOMPatch.ts

export default function applyGoogleTranslateDOMPatch() {
  if (typeof Node === 'function' && Node.prototype) {
    const originalRemoveChild = Node.prototype.removeChild

    Node.prototype.removeChild = function <T extends Node>(child: T): T {
      if (child.parentNode !== this) {
        console.warn(
          'Google Translate attempted to remove a child node from the wrong parent. Skipping.',
          {
            childNode: child?.nodeName,
            expectedParent: this?.nodeName,
            actualParent: child?.parentNode?.nodeName,
          }
        )
        return child
      }

      return originalRemoveChild.call(this, child) as T
    }

    const originalInsertBefore = Node.prototype.insertBefore

    Node.prototype.insertBefore = function <T extends Node>(
      newNode: T,
      referenceNode: Node | null
    ): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        console.warn(
          'Google Translate attempted to insert before a reference node from the wrong parent. Skipping.',
          {
            newNode: newNode?.nodeName,
            expectedParent: this?.nodeName,
            actualParent: referenceNode?.parentNode?.nodeName,
          }
        )
        return newNode
      }

      return originalInsertBefore.call(this, newNode, referenceNode) as T
    }
  }
}

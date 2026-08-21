export interface GridNode {
  col: number
  row: number
}

export interface PathPoint {
  col: number
  row: number
}

/**
 * Small deterministic A* pathfinder for the chase road grid.
 * Nodes represent road intersections; edges are the horizontal/vertical
 * road segments between adjacent intersections, matching Pac-Man-style
 * movement.
 */
export class RoadPathfinder {
  readonly cols: number
  readonly rows: number

  constructor(cols: number, rows: number) {
    this.cols = Math.max(1, Math.floor(cols))
    this.rows = Math.max(1, Math.floor(rows))
  }

  clampNode(node: GridNode): GridNode {
    return {
      col: Math.max(0, Math.min(this.cols, Math.round(node.col))),
      row: Math.max(0, Math.min(this.rows, Math.round(node.row))),
    }
  }

  nearestNode(col: number, row: number): GridNode {
    return this.clampNode({ col, row })
  }

  neighbors(node: GridNode): GridNode[] {
    const result: GridNode[] = []
    const candidates = [
      { col: node.col - 1, row: node.row },
      { col: node.col + 1, row: node.row },
      { col: node.col, row: node.row - 1 },
      { col: node.col, row: node.row + 1 },
    ]

    for (const candidate of candidates) {
      if (
        candidate.col >= 0 &&
        candidate.col <= this.cols &&
        candidate.row >= 0 &&
        candidate.row <= this.rows
      ) {
        result.push(candidate)
      }
    }

    return result
  }

  findPath(start: GridNode, goal: GridNode): GridNode[] {
    const safeStart = this.clampNode(start)
    const safeGoal = this.clampNode(goal)

    if (safeStart.col === safeGoal.col && safeStart.row === safeGoal.row) {
      return [safeStart]
    }

    const key = (node: GridNode) => `${node.col},${node.row}`
    const same = (a: GridNode, b: GridNode) => a.col === b.col && a.row === b.row

    const open: GridNode[] = [safeStart]
    const cameFrom = new Map<string, GridNode>()
    const gScore = new Map<string, number>([[key(safeStart), 0]])
    const fScore = new Map<string, number>([
      [key(safeStart), this.heuristic(safeStart, safeGoal)],
    ])

    while (open.length > 0) {
      let bestIndex = 0
      for (let i = 1; i < open.length; i += 1) {
        const currentScore = fScore.get(key(open[i])) ?? Number.POSITIVE_INFINITY
        const bestScore = fScore.get(key(open[bestIndex])) ?? Number.POSITIVE_INFINITY
        if (currentScore < bestScore) bestIndex = i
      }

      const current = open.splice(bestIndex, 1)[0]
      if (same(current, safeGoal)) {
        return this.reconstruct(cameFrom, current)
      }

      const currentKey = key(current)
      const currentG = gScore.get(currentKey) ?? Number.POSITIVE_INFINITY

      for (const next of this.neighbors(current)) {
        const nextKey = key(next)
        const tentative = currentG + 1
        if (tentative >= (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue

        cameFrom.set(nextKey, current)
        gScore.set(nextKey, tentative)
        fScore.set(nextKey, tentative + this.heuristic(next, safeGoal))

        if (!open.some((node) => same(node, next))) {
          open.push(next)
        }
      }
    }

    // The grid is fully connected by design, but returning the start node
    // keeps callers safe if the topology is changed later.
    return [safeStart]
  }

  private heuristic(a: GridNode, b: GridNode) {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row)
  }

  private reconstruct(cameFrom: Map<string, GridNode>, current: GridNode): GridNode[] {
    const key = (node: GridNode) => `${node.col},${node.row}`
    const path: GridNode[] = [current]
    let cursor = current

    while (cameFrom.has(key(cursor))) {
      cursor = cameFrom.get(key(cursor)) as GridNode
      path.unshift(cursor)
    }

    return path
  }
}

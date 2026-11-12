export type PreviewHostBridgeOptions = {
  navigate?: (path: string) => void;
  getRoutePaths?: () => string[];
};

export function collectRoutePathsFromTree(routeTree: any): string[] {
  return [];
}

export function installPreviewHostBridge(options: PreviewHostBridgeOptions = {}): () => void {
  return () => {};
}

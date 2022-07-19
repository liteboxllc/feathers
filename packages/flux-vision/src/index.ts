import FluxVision from "./flux-vision";

declare global {
  interface Window {
    Shopify: { Checkout: { page: unknown; step: number, isOrderStatus: boolean } };
    analytics: SegmentAnalytics.AnalyticsJS;
    flux: FluxVision;
  }
}

export default (function (): void {
  const flux = new FluxVision({
    analytics: window.analytics,
    Shopify: window.Shopify,
  });
  window.flux  = flux;
})();

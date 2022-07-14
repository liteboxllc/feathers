interface ProductData {
  quantity: number;
  price: number;
  product_id: string;
  sku: string;
  url: string;
  name: string;
  category: string;
}

export default class FluxVision {
  htmlDataElements: string;
  checkoutDataset: DOMStringMap;
  productData: ProductData[];
  Shopify: {
    Checkout: { page: unknown; step: unknown; isOrderStatus: boolean };
  };
  analytics: SegmentAnalytics.AnalyticsJS;
  liquidDivSelector: string;

  constructor({
    analytics,
    Shopify,
    liquidDivSelector = "#FLUX_VISION_DATASETS",
  }) {
    this.productData = [];
    this.analytics = analytics;
    this.Shopify = Shopify;
    this.liquidDivSelector = liquidDivSelector;
  }

  public init(): void {
    this.checkDomForSelector();
    this.pullDataFromDOM();
    this.sendAnalytics();
  }

  private checkDomForSelector(): void {
    const { liquidDivSelector } = this;
    const liquidElement = document.querySelector(liquidDivSelector);
    if (!liquidElement) {
      throw new Error(
        `No liquid element found with selector ${liquidDivSelector}. Learn more at https://github.com/broadlume/feathers/tree/master/packages/flux-vision`
      );
    }
  }

  private pullDataFromDOM(): void {
    const { productData } = this;

    //checkout data
    const checkoutElemement = document.querySelector<HTMLDataElement>(
      "#checkout-data"
    );
    this.checkoutDataset = Object.assign({}, checkoutElemement.dataset);

    // product data
    const productsDatasets = document.querySelectorAll<HTMLDataElement>(
      "#product-item-for-analytics-dataset"
    );

    for (let i = 0; i < productsDatasets.length; i++) {
      const productDataset = productsDatasets[i].dataset;
      if (productDataset) {
        const formattedPrice = Number(productDataset.price) / 100;
        productDataset.product_id = productDataset.name;
        productData.push({
          quantity: Number(productDataset.quantity),
          price: formattedPrice,
          product_id: productDataset.product_id,
          name: productDataset.name,
          sku: productDataset.sku,
          url: productDataset.url,
          category: productDataset.category,
        });
      }
    }
  }

  private sendAnalytics(): void {
    const { analytics, checkoutDataset, productData } = this;
    const {
      currentStep,
      currentPage,
      isOrderStatus,
    } = this.getCurrentEnvironment();

    switch (currentStep) {
      case "contact_information":
        analytics.track("Checkout Started", {
          order_id: checkoutDataset.orderNumber,
          value: checkoutDataset.orderPrice,
          currency: "USD",
          products: productData,
          source: "website",
        });
        break;
      case "shipping_method":
        analytics.track("Checkout Step Viewed", {
          checkout_id: checkoutDataset.checkoutId,
          step: 2,
          products: productData,
          source: "website",
        });
        break;
      case "payment_method":
        analytics.track("Checkout Step Viewed", {
          checkout_id: checkoutDataset.checkoutId,
          step: 3,
          products: productData,
          source: "website",
        });
        break;
      default:
        break;
    }

    if (currentStep == "thank_you") {
      const trackOrder = (event: string) => {
        analytics.track(event, {
          checkout_id: checkoutDataset.checkoutId,
          order_id: checkoutDataset.orderId,
          total: Number(checkoutDataset.totalPrice) / 100,
          currency: "USD",
          products: productData,
          source: "website",
        });
      };
      trackOrder("Order Completed");

      const orderHasLiteboxer =
        productData.filter(
          (i) => i.sku.startsWith("SI-LB") && !i.sku.startsWith("SI-LBGO")
        ).length > 0;
      const orderHasWallMount =
        productData.filter((i) => i.sku.startsWith("SI-LBWM")).length > 0;
      const orderHasFloorStand =
        productData.filter(
          (i) =>
            i.sku.startsWith("SI-LB") &&
            !i.sku.startsWith("SI-LBGO") &&
            !i.sku.startsWith("SI-LBWM")
        ).length > 0;
      const orderHasGo =
        productData.filter((i) => i.sku.startsWith("SI-LBGO")).length > 0;

      if (orderHasLiteboxer) {
        trackOrder("Liteboxer Ordered");
      }
      if (orderHasWallMount) {
        trackOrder("Wall Mount Ordered");
      }
      if (orderHasFloorStand) {
        trackOrder("Floor Stand Ordered");
      }
      if (orderHasGo) {
        trackOrder("Go Ordered");
      }
    }
  }

  private getCurrentEnvironment(): {
    currentStep: unknown;
    currentPage: unknown;
    isOrderStatus: unknown;
  } {
    const { Shopify } = this;

    return {
      currentStep: Shopify.Checkout.step,
      currentPage: Shopify.Checkout.page,
      isOrderStatus: Shopify.Checkout.isOrderStatus,
    };
  }
}

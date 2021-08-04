interface ProductData {
  quantity: Number,
  price: Number,
  product_id: String,
  sku: String,
  url: String,
  name: String,
}

/* eslint-disable @typescript-eslint/camelcase */
export default class FluxVision {
  htmlDataElements: string;
  checkoutDataset: DOMStringMap;
  productData: ProductData[];
  Shopify: { Checkout: { page: unknown; step: unknown; isOrderStatus: boolean } };
  firstOrderStatusView: boolean;
  analytics: SegmentAnalytics.AnalyticsJS;
  liquidDivSelector: string;

  constructor({
    analytics,
    Shopify,
    firstOrderStatusView = false,
    liquidDivSelector = "#FLUX_VISION_DATASETS",
  }) {
    this.productData = [];
    this.analytics = analytics;
    this.Shopify = Shopify;
    this.firstOrderStatusView = firstOrderStatusView;
    this.liquidDivSelector = liquidDivSelector;
  }

  public init(firstOrderStatusView: boolean = false): void {
    this.firstOrderStatusView = firstOrderStatusView;
    this.checkDomForSelector();
    this.pullDataFromDOM();
    this.sendAnalytics();
  }

  private checkDomForSelector(): void {
    const { liquidDivSelector } = this;
    const liquidElement = document.querySelector(liquidDivSelector);
    if (!liquidElement) {
      throw new Error(
        `No liquid element found with selector ${liquidDivSelector}. Learn more at https://github.com/broadlume/feathers/tree/master/packages/flux-vision`,
      );
    }
  }

  private pullDataFromDOM(): void {
    const { productData } = this;

    //checkout data
    const checkoutElemement = document.querySelector<HTMLDataElement>(
      "#checkout-data",
    );
    this.checkoutDataset = Object.assign({}, checkoutElemement.dataset);

    // product data
    const productsDatasets = document.querySelectorAll<HTMLDataElement>(
      "#product-item-for-analytics-dataset",
    );

    for (let i = 0; i < productsDatasets.length; i++) {
      const productDataset = productsDatasets[i].dataset;
      if (productDataset) {
        const formattedPrice = Number(productDataset.price) / 100;
        productDataset.product_id = productDataset.name;
        const objectProduct = Object.assign({}, productDataset);
        productData.push({
          quantity: Number(productDataset.quantity),
          price: formattedPrice,
          product_id: productDataset.product_id,
          name: productDataset.name,
          sku: productDataset.sku,
          url: productDataset.url,
        });
      }
    }
  }

  private sendAnalytics(): void {
    const { analytics, checkoutDataset, productData } = this;
    const { currentStep, currentPage, isOrderStatus } = this.getCurrentEnvironment();

    switch (currentStep) {
      case "contact_information":
        analytics.track("Checkout Started", {
          order_id: checkoutDataset.orderNumber,
          value: checkoutDataset.orderPrice,
          currency: "USD",
          products: productData,
        });
        break;
      case "shipping_method":
        analytics.track("Checkout Step Viewed", {
          checkout_id: checkoutDataset.checkoutId,
          step: 2,
          products: productData,
        });
        break;
      case "payment_method":
        analytics.track("Checkout Step Viewed", {
          checkout_id: checkoutDataset.checkoutId,
          step: 3,
          products: productData,
        });
        break;
      default:
        break;
    }

    if (currentPage == "thank_you" || (isOrderStatus === true || this.firstOrderStatusView == true)) {
      analytics.track("Order Completed", {
        checkout_id: checkoutDataset.checkoutId,
        order_id: checkoutDataset.orderNumber,
        total: Number(checkoutDataset.totalPrice) / 100,
        revenue: Number(checkoutDataset.totalPrice) / 100,
        currency: "USD",
        products: productData,
      });

      if (productData.filter(a => a.sku.startsWith("SI-LB")).length > 0) {
        analytics.track("Liteboxer Ordered", {
          checkout_id: checkoutDataset.checkoutId,
          order_id: checkoutDataset.orderNumber,
          total: Number(checkoutDataset.totalPrice) / 100,
          currency: "USD",
          products: productData,
        });
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
      isOrderStatus: Shopify.Checkout.isOrderStatus
    };
  }
}

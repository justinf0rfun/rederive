export type SubscriberStatus = "active" | "unsubscribed";

export type Subscriber = {
  id: string;
  email: string;
  locale: "zh" | "en";
  status: SubscriberStatus;
  provider: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type SubscribeResult =
  | { status: "created"; subscriber: Subscriber }
  | { status: "duplicate"; subscriber: Subscriber };

// src/common/enums/notification-type.enum.ts

// A TypeScript enum for compile-time safety in application code — the
// database column itself is a plain varchar (see notifications.schema.ts
// for why), so this isn't backed by a Postgres enum type.
export enum NotificationType {
  OrderShipped = 'order_shipped',
  OrderDelivered = 'order_delivered',
  OrderCancelled = 'order_cancelled',
  OrderRefunded = 'order_refunded',
  PasswordChanged = 'password_changed',
}

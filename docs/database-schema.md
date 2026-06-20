# Database Schema Proposal

## Foundational Tables

- organizations
- branches
- users
- roles
- permissions
- role_permissions
- user_roles
- audit_logs
- sequences

## POS

- orders
- order_items
- order_item_notes
- order_payments
- suspended_orders

## Treasury

- cash_boxes
- shifts
- shift_openings
- shift_closings
- payment_methods
- treasury_transactions
- cash_counts

## Catalog

- product_categories
- products
- product_prices
- product_status_events

## Inventory

- warehouses
- units
- unit_conversions
- stock_items
- stock_documents
- stock_document_lines
- stock_ledger_entries
- stock_counts
- stock_count_lines

## Recipes

- recipes
- recipe_versions
- recipe_components

## Purchasing

- vendors
- purchase_orders
- purchase_order_lines
- goods_receipts
- goods_receipt_lines
- vendor_invoices
- vendor_invoice_lines
- vendor_payments

## Expenses

- expense_categories
- operating_expenses
- operating_expense_payments
- setup_categories
- setup_cost_items
- setup_cost_payments

## Sequence Strategy

- `sequences` stores the current numeric value per document type and branch.
- document codes are generated in the backend in the format `TYPE-YYYYMM-000001`.
- supported prefixes include `INV`, `SHF`, `PUR`, `EXP`, `SET`.

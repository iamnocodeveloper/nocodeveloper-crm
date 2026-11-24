CREATE TABLE "store_order" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"source" text DEFAULT 'woocommerce' NOT NULL,
	"store_url" text NOT NULL,
	"external_id" text NOT NULL,
	"number" text,
	"status" text NOT NULL,
	"total_cents" integer,
	"currency" text,
	"customer_name" text,
	"phone" text,
	"email" text,
	"items" jsonb,
	"payment_url" text,
	"tracking_number" text,
	"tracking_url" text,
	"opt_in" boolean,
	"contact_id" text,
	"notifications" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order_created_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"require_opt_in" boolean DEFAULT false NOT NULL,
	"create_leads" boolean DEFAULT true NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"store_url" text,
	"store_name" text,
	"last_event_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_order" ADD CONSTRAINT "store_order_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_order" ADD CONSTRAINT "store_order_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "store_order_org_store_ext_uq" ON "store_order" USING btree ("organization_id","store_url","external_id");--> statement-breakpoint
CREATE INDEX "store_order_org_updated_idx" ON "store_order" USING btree ("organization_id","updated_at");--> statement-breakpoint
CREATE INDEX "store_order_contact_idx" ON "store_order" USING btree ("contact_id");
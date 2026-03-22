export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      attribute_items: {
        Row: {
          attribute_id: string
          color_code: string | null
          created_at: string
          id: string
          sort_order: number
          value: string
        }
        Insert: {
          attribute_id: string
          color_code?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          value: string
        }
        Update: {
          attribute_id?: string
          color_code?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_items_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          attribute_type: string
          created_at: string
          id: string
          name: string
          shop_id: string
        }
        Insert: {
          attribute_type?: string
          created_at?: string
          id?: string
          name: string
          shop_id: string
        }
        Update: {
          attribute_type?: string
          created_at?: string
          id?: string
          name?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attributes_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_proofs: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          screenshot_url: string
          shop_id: string
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          screenshot_url: string
          shop_id: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          screenshot_url?: string
          shop_id?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_proofs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_comments: {
        Row: {
          author_id: string
          blog_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          blog_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          blog_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_comments_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "shop_blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_likes: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_likes_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "shop_blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_shares: {
        Row: {
          blog_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          blog_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          blog_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_shares_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "shop_blogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          shop_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          shop_id: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          shop_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activity: {
        Row: {
          activity_type: string
          created_at: string
          customer_id: string
          description: string | null
          id: string
          metadata: Json | null
          reference_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          customer_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          customer_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_activity_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          first_order_at: string | null
          id: string
          last_order_at: string | null
          name: string
          phone: string | null
          shop_id: string
          total_orders: number
          total_spent: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          name: string
          phone?: string | null
          shop_id: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          first_order_at?: string | null
          id?: string
          last_order_at?: string | null
          name?: string
          phone?: string | null
          shop_id?: string
          total_orders?: number
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          last_updated_at: string
          low_stock_threshold: number
          product_id: string
          reserved_quantity: number
          shop_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
          variation_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_updated_at?: string
          low_stock_threshold?: number
          product_id: string
          reserved_quantity?: number
          shop_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          variation_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_updated_at?: string
          low_stock_threshold?: number
          product_id?: string
          reserved_quantity?: number
          shop_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          variation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "product_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_logs: {
        Row: {
          change_type: string
          created_at: string
          created_by: string | null
          id: string
          inventory_id: string
          new_quantity: number | null
          notes: string | null
          previous_quantity: number | null
          quantity_change: number
          reference_id: string | null
        }
        Insert: {
          change_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_id: string
          new_quantity?: number | null
          notes?: string | null
          previous_quantity?: number | null
          quantity_change: number
          reference_id?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_id?: string
          new_quantity?: number | null
          notes?: string | null
          previous_quantity?: number | null
          quantity_change?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          customer_snapshot: Json
          id: string
          items_snapshot: Json
          notes: string | null
          payment_method: string
          payment_method_id: string | null
          payment_proof_url: string | null
          payment_status: string
          shipping_fee: number
          shop_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          customer_snapshot?: Json
          id?: string
          items_snapshot?: Json
          notes?: string | null
          payment_method?: string
          payment_method_id?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          shipping_fee?: number
          shop_id: string
          status?: string
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          customer_snapshot?: Json
          id?: string
          items_snapshot?: Json
          notes?: string | null
          payment_method?: string
          payment_method_id?: string | null
          payment_proof_url?: string | null
          payment_status?: string
          shipping_fee?: number
          shop_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          proof_required: boolean
          shop_id: string
          type: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          proof_required?: boolean
          shop_id: string
          type: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          proof_required?: boolean
          shop_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variations: {
        Row: {
          attribute_combination: Json
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          price: number | null
          product_id: string
          sale_price: number | null
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          attribute_combination?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number | null
          product_id: string
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          attribute_combination?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number | null
          product_id?: string
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          category: string | null
          condition: string
          created_at: string
          description: string | null
          gallery_images: string[]
          id: string
          image_urls: string[]
          is_active: boolean
          list_on_marketplace: boolean
          main_image: string | null
          name: string
          payment_method_ids: string[]
          price: number
          product_type: string
          sale_end: string | null
          sale_price: number | null
          sale_start: string | null
          shop_id: string
          sku: string | null
          slug: string
          status: string
          stock: number
          track_inventory: boolean
          updated_at: string
          variants: Json
        }
        Insert: {
          attributes?: Json
          category?: string | null
          condition?: string
          created_at?: string
          description?: string | null
          gallery_images?: string[]
          id?: string
          image_urls?: string[]
          is_active?: boolean
          list_on_marketplace?: boolean
          main_image?: string | null
          name: string
          payment_method_ids?: string[]
          price: number
          product_type?: string
          sale_end?: string | null
          sale_price?: number | null
          sale_start?: string | null
          shop_id: string
          sku?: string | null
          slug: string
          status?: string
          stock?: number
          track_inventory?: boolean
          updated_at?: string
          variants?: Json
        }
        Update: {
          attributes?: Json
          category?: string | null
          condition?: string
          created_at?: string
          description?: string | null
          gallery_images?: string[]
          id?: string
          image_urls?: string[]
          is_active?: boolean
          list_on_marketplace?: boolean
          main_image?: string | null
          name?: string
          payment_method_ids?: string[]
          price?: number
          product_type?: string
          sale_end?: string | null
          sale_price?: number | null
          sale_start?: string | null
          shop_id?: string
          sku?: string | null
          slug?: string
          status?: string
          stock?: number
          track_inventory?: boolean
          updated_at?: string
          variants?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_blogs: {
        Row: {
          author_id: string | null
          body: string
          category: string | null
          created_at: string
          id: string
          image_urls: string[]
          published: boolean
          shop_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          category?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          published?: boolean
          shop_id: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          image_urls?: string[]
          published?: boolean
          shop_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_blogs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_blogs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          allow_guest_purchase: boolean
          banner_image_url: string | null
          cover_url: string | null
          created_at: string
          delivery_policy: string | null
          description: string | null
          id: string
          inspection_requested_at: string | null
          is_active: boolean
          location: string | null
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          profile_image_url: string | null
          promotion_body: string | null
          promotion_button_link: string | null
          promotion_button_text: string | null
          promotion_enabled: boolean
          promotion_title: string | null
          rejection_reason: string | null
          shop_bio: string | null
          slug: string
          status: string
          subscription_expires_at: string | null
          updated_at: string
        }
        Insert: {
          allow_guest_purchase?: boolean
          banner_image_url?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_policy?: string | null
          description?: string | null
          id?: string
          inspection_requested_at?: string | null
          is_active?: boolean
          location?: string | null
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          profile_image_url?: string | null
          promotion_body?: string | null
          promotion_button_link?: string | null
          promotion_button_text?: string | null
          promotion_enabled?: boolean
          promotion_title?: string | null
          rejection_reason?: string | null
          shop_bio?: string | null
          slug: string
          status?: string
          subscription_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          allow_guest_purchase?: boolean
          banner_image_url?: string | null
          cover_url?: string | null
          created_at?: string
          delivery_policy?: string | null
          description?: string | null
          id?: string
          inspection_requested_at?: string | null
          is_active?: boolean
          location?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          profile_image_url?: string | null
          promotion_body?: string | null
          promotion_button_link?: string | null
          promotion_button_text?: string | null
          promotion_enabled?: boolean
          promotion_title?: string | null
          rejection_reason?: string | null
          shop_bio?: string | null
          slug?: string
          status?: string
          subscription_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      manual_inventory_update: {
        Args: {
          p_change_type: string
          p_inventory_id: string
          p_new_quantity: number
          p_notes?: string
          p_user_id?: string
        }
        Returns: boolean
      }
      restore_inventory_on_cancel: {
        Args: {
          p_inventory_id: string
          p_order_id: string
          p_quantity: number
          p_user_id?: string
        }
        Returns: boolean
      }
      update_customer_stats_on_order: {
        Args: { p_customer_id: string; p_order_total: number }
        Returns: boolean
      }
      update_inventory_on_order: {
        Args: {
          p_inventory_id: string
          p_order_id: string
          p_quantity: number
          p_user_id?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

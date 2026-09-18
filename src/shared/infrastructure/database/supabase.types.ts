export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      inventory_movements: {
        Row: {
          created_at: string
          id: string
          merchant_id: string
          metadata: Json
          movement_type: string
          order_id: string | null
          quantity: number
          raw_material_id: string
          recorded_by: string | null
          unit_cost: number
          waste_log_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          merchant_id: string
          metadata?: Json
          movement_type: string
          order_id?: string | null
          quantity: number
          raw_material_id: string
          recorded_by?: string | null
          unit_cost: number
          waste_log_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          merchant_id?: string
          metadata?: Json
          movement_type?: string
          order_id?: string | null
          quantity?: number
          raw_material_id?: string
          recorded_by?: string | null
          unit_cost?: number
          waste_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_waste_log_id_fkey"
            columns: ["waste_log_id"]
            isOneToOne: false
            referencedRelation: "waste_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_costing: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          merchant_id: string
          updated_at: string
          waste_pct: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          merchant_id: string
          updated_at?: string
          waste_pct?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          merchant_id?: string
          updated_at?: string
          waste_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_costing_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: true
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_costing_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          item_kind: Database["public"]["Enums"]["menu_item_kind"]
          merchant_id: string
          name: string
          price: number
          protein_group: string | null
          weight_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_kind?: Database["public"]["Enums"]["menu_item_kind"]
          merchant_id: string
          name: string
          price: number
          protein_group?: string | null
          weight_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_kind?: Database["public"]["Enums"]["menu_item_kind"]
          merchant_id?: string
          name?: string
          price?: number
          protein_group?: string | null
          weight_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          created_at: string
          id: string
          monthly_fixed_overhead: number | null
          name: string
          phone: string | null
          seating_table_count: number | null
          target_food_cost_pct: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          monthly_fixed_overhead?: number | null
          name: string
          phone?: string | null
          seating_table_count?: number | null
          target_food_cost_pct?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          monthly_fixed_overhead?: number | null
          name?: string
          phone?: string | null
          seating_table_count?: number | null
          target_food_cost_pct?: number
        }
        Relationships: []
      }
      order_item_sides: {
        Row: {
          id: string
          order_item_id: string
          side_menu_item_id: string
          slot: number
        }
        Insert: {
          id?: string
          order_item_id: string
          side_menu_item_id: string
          slot: number
        }
        Update: {
          id?: string
          order_item_id?: string
          side_menu_item_id?: string
          slot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_sides_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_sides_side_menu_item_id_fkey"
            columns: ["side_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          menu_item_id: string
          order_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Insert: {
          id?: string
          menu_item_id: string
          order_id: string
          quantity: number
          subtotal: number
          unit_price: number
        }
        Update: {
          id?: string
          menu_item_id?: string
          order_id?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          delivery_fee: number
          delivery_zone: string | null
          id: string
          inventory_deducted_at: string | null
          merchant_id: string
          ready_at: string | null
          sent_to_kitchen_at: string | null
          server_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          table_number: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          delivery_zone?: string | null
          id?: string
          inventory_deducted_at?: string | null
          merchant_id: string
          ready_at?: string | null
          sent_to_kitchen_at?: string | null
          server_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          table_number?: number | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          delivery_zone?: string | null
          id?: string
          inventory_deducted_at?: string | null
          merchant_id?: string
          ready_at?: string | null
          sent_to_kitchen_at?: string | null
          server_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          table_number?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials_inventory: {
        Row: {
          id: string
          is_active: boolean
          last_updated: string
          merchant_id: string
          name: string
          quantity_on_hand: number
          sku: string | null
          unit_cost: number
          unit_of_measure: Database["public"]["Enums"]["unit_of_measure"]
        }
        Insert: {
          id?: string
          is_active?: boolean
          last_updated?: string
          merchant_id: string
          name: string
          quantity_on_hand?: number
          sku?: string | null
          unit_cost?: number
          unit_of_measure: Database["public"]["Enums"]["unit_of_measure"]
        }
        Update: {
          id?: string
          is_active?: boolean
          last_updated?: string
          merchant_id?: string
          name?: string
          quantity_on_hand?: number
          sku?: string | null
          unit_cost?: number
          unit_of_measure?: Database["public"]["Enums"]["unit_of_measure"]
        }
        Relationships: [
          {
            foreignKeyName: "raw_materials_inventory_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_ingredients: {
        Row: {
          id: string
          menu_item_id: string
          quantity_kg: number
          raw_material_id: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          quantity_kg: number
          raw_material_id: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          quantity_kg?: number
          raw_material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_ingredients_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      table_sessions_log: {
        Row: {
          closed_at: string
          created_at: string
          id: string
          merchant_id: string
          opened_at: string
          order_id: string | null
          preparation_time_minutes: number
          table_number: number
          ticket_total: number
        }
        Insert: {
          closed_at: string
          created_at?: string
          id?: string
          merchant_id: string
          opened_at: string
          order_id?: string | null
          preparation_time_minutes: number
          table_number: number
          ticket_total: number
        }
        Update: {
          closed_at?: string
          created_at?: string
          id?: string
          merchant_id?: string
          opened_at?: string
          order_id?: string | null
          preparation_time_minutes?: number
          table_number?: number
          ticket_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "table_sessions_log_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_sessions_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          merchant_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          merchant_id: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          merchant_id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_logs: {
        Row: {
          created_at: string
          id: string
          logged_by: string | null
          merchant_id: string
          raw_material_id: string | null
          reason: Database["public"]["Enums"]["waste_reason"]
          total_cost: number
          unit_cost: number
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          logged_by?: string | null
          merchant_id: string
          raw_material_id?: string | null
          reason: Database["public"]["Enums"]["waste_reason"]
          total_cost: number
          unit_cost: number
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          logged_by?: string | null
          merchant_id?: string
          raw_material_id?: string | null
          reason?: Database["public"]["Enums"]["waste_reason"]
          total_cost?: number
          unit_cost?: number
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "waste_logs_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_inventory_receipt: {
        Args: {
          p_movement_quantity: number
          p_movement_unit_cost: number
          p_quantity_on_hand: number
          p_raw_material_id: string
          p_unit_cost: number
        }
        Returns: undefined
      }
      complete_order_and_deduct_inventory: {
        Args: { p_order_id: string }
        Returns: Json
      }
      create_merchant_and_admin_profile: {
        Args: {
          p_address?: string
          p_full_name: string
          p_merchant_name: string
          p_phone?: string
        }
        Returns: string
      }
      create_order_with_items: {
        Args: {
          p_delivery_fee: number
          p_delivery_zone: string | null
          p_lines: Json
          p_service_type: Database["public"]["Enums"]["service_type"]
          p_total_amount: number
        }
        Returns: string
      }
      create_staff_user_profile: {
        Args: {
          p_email: string
          p_full_name: string
          p_role: Database["public"]["Enums"]["user_role"]
          p_user_id: string
        }
        Returns: string
      }
      get_user_merchant_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      log_operational_waste: {
        Args: {
          p_raw_material_id: string
          p_weight_kg: number
          p_reason: Database["public"]["Enums"]["waste_reason"]
        }
        Returns: Json
      }
    }
    Enums: {
      menu_item_kind: "meat_plate" | "drink" | "side"
      order_status: "pending" | "cooking" | "served" | "completed" | "cancelled"
      service_type: "dine_in" | "take_out" | "delivery"
      unit_of_measure: "kilogram" | "unit"
      user_role: "admin" | "grill_master" | "waiter"
      waste_reason:
        | "burned_on_grill"
        | "fat_discarded"
        | "spoiled_raw"
        | "customer_return"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {
      menu_item_kind: ["meat_plate", "drink", "side"],
      order_status: ["pending", "cooking", "served", "completed", "cancelled"],
      service_type: ["dine_in", "take_out", "delivery"],
      unit_of_measure: ["kilogram", "unit"],
      user_role: ["admin", "grill_master", "waiter"],
      waste_reason: [
        "burned_on_grill",
        "fat_discarded",
        "spoiled_raw",
        "customer_return",
      ],
    },
  },
} as const


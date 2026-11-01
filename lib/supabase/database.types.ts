
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_runs": {
                  Row: {
                    "cost_usd": number | null,"created_at": string,"error": string | null,"id": number,"input_hash": string,"input_tokens": number | null,"intake_item_id": string | null,"latency_ms": number | null,"mode": string,"model": string | null,"output": Json | null,"output_tokens": number | null,"stage": string,"success": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_usd"?: number | null,"created_at"?: string,"error"?: string | null,"id"?: never,"input_hash": string,"input_tokens"?: number | null,"intake_item_id"?: string | null,"latency_ms"?: number | null,"mode": string,"model"?: string | null,"output"?: Json | null,"output_tokens"?: number | null,"stage": string,"success": boolean
                  }
                  Update: {
                    "cost_usd"?: number | null,"created_at"?: string,"error"?: string | null,"id"?: never,"input_hash"?: string,"input_tokens"?: number | null,"intake_item_id"?: string | null,"latency_ms"?: number | null,"mode"?: string,"model"?: string | null,"output"?: Json | null,"output_tokens"?: number | null,"stage"?: string,"success"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_runs_intake_item_id_fkey"
      columns: ["intake_item_id"]
isOneToOne: false
      referencedRelation: "intake_items"
      referencedColumns: ["id"]
    }
                  ]
                },"alert_contacts": {
                  Row: {
                    "alert_id": string,"phone": string | null,"phone_hash": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id": string,"phone"?: string | null,"phone_hash"?: string | null
                  }
                  Update: {
                    "alert_id"?: string,"phone"?: string | null,"phone_hash"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_contacts_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: true
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    }
                  ]
                },"alert_sources": {
                  Row: {
                    "added_at": string,"alert_id": string,"channel": Database["public"]['Enums']["intake_channel"],"id": number,"intake_item_id": string | null,"similarity": number | null,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"alert_id": string,"channel": Database["public"]['Enums']["intake_channel"],"id"?: never,"intake_item_id"?: string | null,"similarity"?: number | null,"url"?: string | null
                  }
                  Update: {
                    "added_at"?: string,"alert_id"?: string,"channel"?: Database["public"]['Enums']["intake_channel"],"id"?: never,"intake_item_id"?: string | null,"similarity"?: number | null,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_sources_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alert_sources_intake_item_id_fkey"
      columns: ["intake_item_id"]
isOneToOne: false
      referencedRelation: "intake_items"
      referencedColumns: ["id"]
    }
                  ]
                },"alert_volunteers": {
                  Row: {
                    "alert_id": string,"confirmed_at": string | null,"confirmed_by": string | null,"hours": number | null,"joined_at": string,"status": Database["public"]['Enums']["volunteer_status"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id": string,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"hours"?: number | null,"joined_at"?: string,"status"?: Database["public"]['Enums']["volunteer_status"],"user_id": string
                  }
                  Update: {
                    "alert_id"?: string,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"hours"?: number | null,"joined_at"?: string,"status"?: Database["public"]['Enums']["volunteer_status"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alert_volunteers_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alert_volunteers_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alert_volunteers_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alert_volunteers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alert_volunteers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"alerts": {
                  Row: {
                    "ai_confidence": number | null,"ai_mode": string,"association_id": string | null,"baladiya_id": number | null,"baladiya_name": string | null,"blood_type": Database["public"]['Enums']["blood_type"] | null,"canonical_text": string | null,"category": Database["public"]['Enums']["alert_category"],"contact_name": string | null,"content_hash": string | null,"created_at": string,"credibility_reasons": NonNullable<Json>,"credibility_score": number | null,"darija_terms": NonNullable<Json>,"deadline": string | null,"embedding": string | null,"first_seen_at": string | null,"id": string,"institution_name": string | null,"lat": number | null,"lng": number | null,"location_precision": string,"merged_into": string | null,"needs_review_reasons": (string)[],"normalized_text": string | null,"original_text": string,"owner_id": string | null,"quantity": number | null,"resolved_at": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"source_count": number,"status": Database["public"]['Enums']["alert_status"],"summary": string,"title": string,"updated_at": string,"urgency": Database["public"]['Enums']["urgency"],"verdict": Database["public"]['Enums']["ai_verdict"] | null,"volunteers_needed": number,"wilaya_code": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_confidence"?: number | null,"ai_mode"?: string,"association_id"?: string | null,"baladiya_id"?: number | null,"baladiya_name"?: string | null,"blood_type"?: Database["public"]['Enums']["blood_type"] | null,"canonical_text"?: string | null,"category": Database["public"]['Enums']["alert_category"],"contact_name"?: string | null,"content_hash"?: string | null,"created_at"?: string,"credibility_reasons"?: NonNullable<Json>,"credibility_score"?: number | null,"darija_terms"?: NonNullable<Json>,"deadline"?: string | null,"embedding"?: string | null,"first_seen_at"?: string | null,"id"?: string,"institution_name"?: string | null,"lat"?: number | null,"lng"?: number | null,"location_precision"?: string,"merged_into"?: string | null,"needs_review_reasons"?: (string)[],"normalized_text"?: string | null,"original_text": string,"owner_id"?: string | null,"quantity"?: number | null,"resolved_at"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source_count"?: number,"status"?: Database["public"]['Enums']["alert_status"],"summary"?: string,"title": string,"updated_at"?: string,"urgency"?: Database["public"]['Enums']["urgency"],"verdict"?: Database["public"]['Enums']["ai_verdict"] | null,"volunteers_needed"?: number,"wilaya_code"?: number | null
                  }
                  Update: {
                    "ai_confidence"?: number | null,"ai_mode"?: string,"association_id"?: string | null,"baladiya_id"?: number | null,"baladiya_name"?: string | null,"blood_type"?: Database["public"]['Enums']["blood_type"] | null,"canonical_text"?: string | null,"category"?: Database["public"]['Enums']["alert_category"],"contact_name"?: string | null,"content_hash"?: string | null,"created_at"?: string,"credibility_reasons"?: NonNullable<Json>,"credibility_score"?: number | null,"darija_terms"?: NonNullable<Json>,"deadline"?: string | null,"embedding"?: string | null,"first_seen_at"?: string | null,"id"?: string,"institution_name"?: string | null,"lat"?: number | null,"lng"?: number | null,"location_precision"?: string,"merged_into"?: string | null,"needs_review_reasons"?: (string)[],"normalized_text"?: string | null,"original_text"?: string,"owner_id"?: string | null,"quantity"?: number | null,"resolved_at"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"source_count"?: number,"status"?: Database["public"]['Enums']["alert_status"],"summary"?: string,"title"?: string,"updated_at"?: string,"urgency"?: Database["public"]['Enums']["urgency"],"verdict"?: Database["public"]['Enums']["ai_verdict"] | null,"volunteers_needed"?: number,"wilaya_code"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_baladiya_id_fkey"
      columns: ["baladiya_id"]
isOneToOne: false
      referencedRelation: "baladiyas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_merged_into_fkey"
      columns: ["merged_into"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "alerts_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"attendance": {
                  Row: {
                    "activity_id": string,"checked_in_at": string,"checked_in_by": string,"hours": number | null,"id": number,"token_nonce": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id": string,"checked_in_at"?: string,"checked_in_by": string,"hours"?: number | null,"id"?: never,"token_nonce": string,"user_id": string
                  }
                  Update: {
                    "activity_id"?: string,"checked_in_at"?: string,"checked_in_by"?: string,"hours"?: number | null,"id"?: never,"token_nonce"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "club_activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_checked_in_by_fkey"
      columns: ["checked_in_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_checked_in_by_fkey"
      columns: ["checked_in_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity": string,"entity_id": string | null,"id": number,"wilaya_code": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity": string,"entity_id"?: string | null,"id"?: never,"wilaya_code"?: number | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string | null,"id"?: never,"wilaya_code"?: number | null
                  }
                  Relationships: [
                    
                  ]
                },"baladiyas": {
                  Row: {
                    "created_at": string,"id": number,"lat": number | null,"lng": number | null,"name_ar": string,"name_fr": string | null,"ons_code": string | null,"source": string,"wilaya_code": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: number,"lat"?: number | null,"lng"?: number | null,"name_ar": string,"name_fr"?: string | null,"ons_code"?: string | null,"source": string,"wilaya_code": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: number,"lat"?: number | null,"lng"?: number | null,"name_ar"?: string,"name_fr"?: string | null,"ons_code"?: string | null,"source"?: string,"wilaya_code"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "baladiyas_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"blood_compatibility": {
                  Row: {
                    "donor": Database["public"]['Enums']["blood_type"],"recipient": Database["public"]['Enums']["blood_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "donor": Database["public"]['Enums']["blood_type"],"recipient": Database["public"]['Enums']["blood_type"]
                  }
                  Update: {
                    "donor"?: Database["public"]['Enums']["blood_type"],"recipient"?: Database["public"]['Enums']["blood_type"]
                  }
                  Relationships: [
                    
                  ]
                },"categories": {
                  Row: {
                    "emoji": string,"key": Database["public"]['Enums']["alert_category"],"label_ar": string,"label_fr": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "emoji": string,"key": Database["public"]['Enums']["alert_category"],"label_ar": string,"label_fr": string,"sort_order": number
                  }
                  Update: {
                    "emoji"?: string,"key"?: Database["public"]['Enums']["alert_category"],"label_ar"?: string,"label_fr"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"certificates": {
                  Row: {
                    "activities": number,"holder_name": string,"hours": number,"id": string,"issued_at": string,"issuer": string,"period_end": string,"period_start": string,"revoked_at": string | null,"revoked_reason": string | null,"signature": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "activities": number,"holder_name": string,"hours": number,"id"?: string,"issued_at"?: string,"issuer"?: string,"period_end": string,"period_start": string,"revoked_at"?: string | null,"revoked_reason"?: string | null,"signature": string,"user_id": string
                  }
                  Update: {
                    "activities"?: number,"holder_name"?: string,"hours"?: number,"id"?: string,"issued_at"?: string,"issuer"?: string,"period_end"?: string,"period_start"?: string,"revoked_at"?: string | null,"revoked_reason"?: string | null,"signature"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificates_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"club_activities": {
                  Row: {
                    "alert_id": string | null,"club_id": string | null,"created_at": string,"created_by": string | null,"description": string,"ends_at": string | null,"id": string,"location": string | null,"starts_at": string,"status": string,"title": string,"wilaya_code": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id"?: string | null,"club_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"ends_at"?: string | null,"id"?: string,"location"?: string | null,"starts_at": string,"status"?: string,"title": string,"wilaya_code": number
                  }
                  Update: {
                    "alert_id"?: string | null,"club_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"ends_at"?: string | null,"id"?: string,"location"?: string | null,"starts_at"?: string,"status"?: string,"title"?: string,"wilaya_code"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_activities_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_activities_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "club_stats"
      referencedColumns: ["club_id"]
    },{
      foreignKeyName: "club_activities_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_activities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_activities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_activities_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"club_members": {
                  Row: {
                    "club_id": string,"joined_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "club_id": string,"joined_at"?: string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "club_id"?: string,"joined_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "club_members_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "club_stats"
      referencedColumns: ["club_id"]
    },{
      foreignKeyName: "club_members_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "club_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"clubs": {
                  Row: {
                    "baladiya_id": number | null,"created_at": string,"created_by": string | null,"description": string,"focus": (Database["public"]['Enums']["alert_category"])[],"id": string,"institution_id": string | null,"institution_name": string | null,"name": string,"status": Database["public"]['Enums']["review_status"],"updated_at": string,"wilaya_code": number
                  }
                  ComputedFields: never
                  Insert: {
                    "baladiya_id"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"focus"?: (Database["public"]['Enums']["alert_category"])[],"id"?: string,"institution_id"?: string | null,"institution_name"?: string | null,"name": string,"status"?: Database["public"]['Enums']["review_status"],"updated_at"?: string,"wilaya_code": number
                  }
                  Update: {
                    "baladiya_id"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"focus"?: (Database["public"]['Enums']["alert_category"])[],"id"?: string,"institution_id"?: string | null,"institution_name"?: string | null,"name"?: string,"status"?: Database["public"]['Enums']["review_status"],"updated_at"?: string,"wilaya_code"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "clubs_baladiya_id_fkey"
      columns: ["baladiya_id"]
isOneToOne: false
      referencedRelation: "baladiyas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clubs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clubs_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clubs_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clubs_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"consents": {
                  Row: {
                    "granted_at": string,"id": number,"intake_item_id": string | null,"purpose": string,"revoked_at": string | null,"user_id": string | null,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"id"?: never,"intake_item_id"?: string | null,"purpose": string,"revoked_at"?: string | null,"user_id"?: string | null,"version": string
                  }
                  Update: {
                    "granted_at"?: string,"id"?: never,"intake_item_id"?: string | null,"purpose"?: string,"revoked_at"?: string | null,"user_id"?: string | null,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "consents_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"crises": {
                  Row: {
                    "closed_at": string | null,"closed_by": string | null,"closure_report": string | null,"id": string,"sms_template": string,"started_at": string,"started_by": string,"status": string,"title": string,"type": Database["public"]['Enums']["crisis_type"],"wilaya_code": number
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"closure_report"?: string | null,"id"?: string,"sms_template": string,"started_at"?: string,"started_by": string,"status"?: string,"title": string,"type": Database["public"]['Enums']["crisis_type"],"wilaya_code": number
                  }
                  Update: {
                    "closed_at"?: string | null,"closed_by"?: string | null,"closure_report"?: string | null,"id"?: string,"sms_template"?: string,"started_at"?: string,"started_by"?: string,"status"?: string,"title"?: string,"type"?: Database["public"]['Enums']["crisis_type"],"wilaya_code"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "crises_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crises_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crises_started_by_fkey"
      columns: ["started_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crises_started_by_fkey"
      columns: ["started_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crises_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"crisis_confirmations": {
                  Row: {
                    "confirmed_at": string,"crisis_id": string,"user_id": string,"via": string
                  }
                  ComputedFields: never
                  Insert: {
                    "confirmed_at"?: string,"crisis_id": string,"user_id": string,"via": string
                  }
                  Update: {
                    "confirmed_at"?: string,"crisis_id"?: string,"user_id"?: string,"via"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "crisis_confirmations_crisis_id_fkey"
      columns: ["crisis_id"]
isOneToOne: false
      referencedRelation: "crises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crisis_confirmations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crisis_confirmations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"crisis_updates": {
                  Row: {
                    "body": string,"created_at": string,"created_by": string,"crisis_id": string,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"created_by": string,"crisis_id": string,"id"?: never
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"created_by"?: string,"crisis_id"?: string,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "crisis_updates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crisis_updates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "crisis_updates_crisis_id_fkey"
      columns: ["crisis_id"]
isOneToOne: false
      referencedRelation: "crises"
      referencedColumns: ["id"]
    }
                  ]
                },"deletion_requests": {
                  Row: {
                    "id": number,"processed_at": string | null,"reason": string | null,"requested_at": string,"scheduled_for": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"processed_at"?: string | null,"reason"?: string | null,"requested_at"?: string,"scheduled_for"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "id"?: never,"processed_at"?: string | null,"reason"?: string | null,"requested_at"?: string,"scheduled_for"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deletion_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deletion_requests_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"historical_posts": {
                  Row: {
                    "alert_id": string | null,"category": Database["public"]['Enums']["alert_category"] | null,"content_hash": string,"embedding": string | null,"first_seen_at": string,"id": string,"last_seen_at": string,"normalized_text": string,"phone_hashes": (string)[],"resolved_at": string | null,"source": string,"times_seen": number,"wilaya_code": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id"?: string | null,"category"?: Database["public"]['Enums']["alert_category"] | null,"content_hash": string,"embedding"?: string | null,"first_seen_at": string,"id"?: string,"last_seen_at"?: string,"normalized_text": string,"phone_hashes"?: (string)[],"resolved_at"?: string | null,"source": string,"times_seen"?: number,"wilaya_code"?: number | null
                  }
                  Update: {
                    "alert_id"?: string | null,"category"?: Database["public"]['Enums']["alert_category"] | null,"content_hash"?: string,"embedding"?: string | null,"first_seen_at"?: string,"id"?: string,"last_seen_at"?: string,"normalized_text"?: string,"phone_hashes"?: (string)[],"resolved_at"?: string | null,"source"?: string,"times_seen"?: number,"wilaya_code"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "historical_posts_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "historical_posts_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"institutions": {
                  Row: {
                    "address": string | null,"baladiya_id": number | null,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["institution_kind"],"lat": number | null,"lng": number | null,"name_ar": string,"name_fr": string | null,"phone": string | null,"source": string,"updated_at": string,"verified": boolean,"wilaya_code": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"baladiya_id"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["institution_kind"],"lat"?: number | null,"lng"?: number | null,"name_ar": string,"name_fr"?: string | null,"phone"?: string | null,"source": string,"updated_at"?: string,"verified"?: boolean,"wilaya_code": number
                  }
                  Update: {
                    "address"?: string | null,"baladiya_id"?: number | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["institution_kind"],"lat"?: number | null,"lng"?: number | null,"name_ar"?: string,"name_fr"?: string | null,"phone"?: string | null,"source"?: string,"updated_at"?: string,"verified"?: boolean,"wilaya_code"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "institutions_baladiya_id_fkey"
      columns: ["baladiya_id"]
isOneToOne: false
      referencedRelation: "baladiyas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "institutions_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"intake_contacts": {
                  Row: {
                    "intake_item_id": string,"name": string | null,"phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "intake_item_id": string,"name"?: string | null,"phone"?: string | null
                  }
                  Update: {
                    "intake_item_id"?: string,"name"?: string | null,"phone"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "intake_contacts_intake_item_id_fkey"
      columns: ["intake_item_id"]
isOneToOne: true
      referencedRelation: "intake_items"
      referencedColumns: ["id"]
    }
                  ]
                },"intake_items": {
                  Row: {
                    "alert_id": string | null,"channel": Database["public"]['Enums']["intake_channel"],"content_hash": string,"error": string | null,"external_id": string | null,"id": string,"pipeline": Json | null,"processed_at": string | null,"raw_text": string,"received_at": string,"source_label": string | null,"source_url": string | null,"status": Database["public"]['Enums']["intake_status"],"submitter_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id"?: string | null,"channel": Database["public"]['Enums']["intake_channel"],"content_hash": string,"error"?: string | null,"external_id"?: string | null,"id"?: string,"pipeline"?: Json | null,"processed_at"?: string | null,"raw_text": string,"received_at"?: string,"source_label"?: string | null,"source_url"?: string | null,"status"?: Database["public"]['Enums']["intake_status"],"submitter_id"?: string | null
                  }
                  Update: {
                    "alert_id"?: string | null,"channel"?: Database["public"]['Enums']["intake_channel"],"content_hash"?: string,"error"?: string | null,"external_id"?: string | null,"id"?: string,"pipeline"?: Json | null,"processed_at"?: string | null,"raw_text"?: string,"received_at"?: string,"source_label"?: string | null,"source_url"?: string | null,"status"?: Database["public"]['Enums']["intake_status"],"submitter_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "intake_items_alert_fk"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intake_items_submitter_id_fkey"
      columns: ["submitter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intake_items_submitter_id_fkey"
      columns: ["submitter_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string,"created_at": string,"id": number,"kind": string,"link": string | null,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string,"created_at"?: string,"id"?: never,"kind": string,"link"?: string | null,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: never,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_private": {
                  Row: {
                    "blood_type": Database["public"]['Enums']["blood_type"] | null,"phone": string | null,"phone_verified": boolean,"sms_opt_in": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blood_type"?: Database["public"]['Enums']["blood_type"] | null,"phone"?: string | null,"phone_verified"?: boolean,"sms_opt_in"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "blood_type"?: Database["public"]['Enums']["blood_type"] | null,"phone"?: string | null,"phone_verified"?: boolean,"sms_opt_in"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_private_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_private_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability"],"baladiya_id": number | null,"created_at": string,"deleted_at": string | null,"display_name": string,"id": string,"locale": string,"onboarded": boolean,"skills": (string)[],"updated_at": string,"wilaya_code": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability"],"baladiya_id"?: number | null,"created_at"?: string,"deleted_at"?: string | null,"display_name"?: string,"id": string,"locale"?: string,"onboarded"?: boolean,"skills"?: (string)[],"updated_at"?: string,"wilaya_code"?: number | null
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability"],"baladiya_id"?: number | null,"created_at"?: string,"deleted_at"?: string | null,"display_name"?: string,"id"?: string,"locale"?: string,"onboarded"?: boolean,"skills"?: (string)[],"updated_at"?: string,"wilaya_code"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_baladiya_id_fkey"
      columns: ["baladiya_id"]
isOneToOne: false
      referencedRelation: "baladiyas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"published_posts": {
                  Row: {
                    "alert_id": string,"approved_at": string | null,"approved_by": string | null,"caption": string,"channels": (string)[],"created_at": string,"created_by": string | null,"id": string,"results": NonNullable<Json>,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_id": string,"approved_at"?: string | null,"approved_by"?: string | null,"caption": string,"channels"?: (string)[],"created_at"?: string,"created_by"?: string | null,"id"?: string,"results"?: NonNullable<Json>,"status"?: string
                  }
                  Update: {
                    "alert_id"?: string,"approved_at"?: string | null,"approved_by"?: string | null,"caption"?: string,"channels"?: (string)[],"created_at"?: string,"created_by"?: string | null,"id"?: string,"results"?: NonNullable<Json>,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "published_posts_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "published_posts_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "published_posts_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "published_posts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "published_posts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "activity_id": string | null,"alert_id": string | null,"attended_count": number,"author_id": string,"created_at": string,"evidence_paths": (string)[],"hours_total": number,"id": string,"organization": string | null,"outcome": string,"resources_used": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["review_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id"?: string | null,"alert_id"?: string | null,"attended_count"?: number,"author_id": string,"created_at"?: string,"evidence_paths"?: (string)[],"hours_total"?: number,"id"?: string,"organization"?: string | null,"outcome": string,"resources_used"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["review_status"]
                  }
                  Update: {
                    "activity_id"?: string | null,"alert_id"?: string | null,"attended_count"?: number,"author_id"?: string,"created_at"?: string,"evidence_paths"?: (string)[],"hours_total"?: number,"id"?: string,"organization"?: string | null,"outcome"?: string,"resources_used"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["review_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "club_activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"shelters": {
                  Row: {
                    "baladiya_id": number | null,"capacity": number,"created_at": string,"id": string,"institution_id": string | null,"is_open": boolean,"lat": number | null,"lng": number | null,"name": string,"needs": (string)[],"occupied": number,"phone": string | null,"updated_at": string,"updated_by": string | null,"wilaya_code": number
                  }
                  ComputedFields: never
                  Insert: {
                    "baladiya_id"?: number | null,"capacity": number,"created_at"?: string,"id"?: string,"institution_id"?: string | null,"is_open"?: boolean,"lat"?: number | null,"lng"?: number | null,"name": string,"needs"?: (string)[],"occupied"?: number,"phone"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"wilaya_code": number
                  }
                  Update: {
                    "baladiya_id"?: number | null,"capacity"?: number,"created_at"?: string,"id"?: string,"institution_id"?: string | null,"is_open"?: boolean,"lat"?: number | null,"lng"?: number | null,"name"?: string,"needs"?: (string)[],"occupied"?: number,"phone"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"wilaya_code"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "shelters_baladiya_id_fkey"
      columns: ["baladiya_id"]
isOneToOne: false
      referencedRelation: "baladiyas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shelters_institution_id_fkey"
      columns: ["institution_id"]
isOneToOne: false
      referencedRelation: "institutions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shelters_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shelters_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shelters_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"sms_messages": {
                  Row: {
                    "body": string,"created_at": string,"crisis_id": string | null,"direction": string,"error": string | null,"id": number,"phone": string,"provider": string,"provider_id": string | null,"status": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"crisis_id"?: string | null,"direction": string,"error"?: string | null,"id"?: never,"phone": string,"provider": string,"provider_id"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"crisis_id"?: string | null,"direction"?: string,"error"?: string | null,"id"?: never,"phone"?: string,"provider"?: string,"provider_id"?: string | null,"status"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sms_messages_crisis_id_fkey"
      columns: ["crisis_id"]
isOneToOne: false
      referencedRelation: "crises"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sms_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sms_messages_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tree_likes": {
                  Row: {
                    "created_at": string,"tree_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"tree_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"tree_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tree_likes_tree_id_fkey"
      columns: ["tree_id"]
isOneToOne: false
      referencedRelation: "trees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tree_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tree_likes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"trees": {
                  Row: {
                    "baladiya_id": number | null,"club_id": string | null,"created_at": string,"exif_taken_at": string | null,"id": string,"lat": number | null,"lng": number | null,"location_check": NonNullable<Json>,"note": string,"photo_path": string | null,"place": string,"review_note": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"species": string,"status": Database["public"]['Enums']["review_status"],"user_id": string,"wilaya_code": number
                  }
                  ComputedFields: never
                  Insert: {
                    "baladiya_id"?: number | null,"club_id"?: string | null,"created_at"?: string,"exif_taken_at"?: string | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"location_check"?: NonNullable<Json>,"note"?: string,"photo_path"?: string | null,"place": string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"species": string,"status"?: Database["public"]['Enums']["review_status"],"user_id": string,"wilaya_code": number
                  }
                  Update: {
                    "baladiya_id"?: number | null,"club_id"?: string | null,"created_at"?: string,"exif_taken_at"?: string | null,"id"?: string,"lat"?: number | null,"lng"?: number | null,"location_check"?: NonNullable<Json>,"note"?: string,"photo_path"?: string | null,"place"?: string,"review_note"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"species"?: string,"status"?: Database["public"]['Enums']["review_status"],"user_id"?: string,"wilaya_code"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "trees_baladiya_id_fkey"
      columns: ["baladiya_id"]
isOneToOne: false
      referencedRelation: "baladiyas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trees_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "club_stats"
      referencedColumns: ["club_id"]
    },{
      foreignKeyName: "trees_club_id_fkey"
      columns: ["club_id"]
isOneToOne: false
      referencedRelation: "clubs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trees_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trees_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trees_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trees_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trees_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string,"wilaya_code": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"role": Database["public"]['Enums']["app_role"],"user_id": string,"wilaya_code"?: number | null
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string,"wilaya_code"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_roles_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"wilayas": {
                  Row: {
                    "code": number,"created_at": string,"lat": number,"lng": number,"name_ar": string,"name_fr": string,"source": string,"updated_at": string,"verified": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "code": number,"created_at"?: string,"lat": number,"lng": number,"name_ar": string,"name_fr": string,"source": string,"updated_at"?: string,"verified"?: boolean
                  }
                  Update: {
                    "code"?: number,"created_at"?: string,"lat"?: number,"lng"?: number,"name_ar"?: string,"name_fr"?: string,"source"?: string,"updated_at"?: string,"verified"?: boolean
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "alert_participation": {
                  Row: {
                    "alert_id": string,"confirmed": number | null,"joined": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "alert_volunteers_alert_id_fkey"
      columns: ["alert_id"]
isOneToOne: false
      referencedRelation: "alerts"
      referencedColumns: ["id"]
    }
                  ]
                },"club_stats": {
                  Row: {
                    "activities_30d": number | null,"club_id": string,"members": number | null,"points": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "activities_30d"?: never,"club_id"?: string | null,"members"?: never,"points"?: never
                         }
                        Update: {
                           "activities_30d"?: never,"club_id"?: string | null,"members"?: never,"points"?: never
                         }
                        Relationships: [
                    
                  ]
                },"point_events": {
                  Row: {
                    "at": string | null,"hours": number | null,"kind": string | null,"points": number | null,"ref": string | null,"user_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"public_profiles": {
                  Row: {
                    "display_name": string,"id": string,"wilaya_code": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "display_name"?: string | null,"id"?: string | null,"wilaya_code"?: number | null
                         }
                        Update: {
                           "display_name"?: string | null,"id"?: string | null,"wilaya_code"?: number | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "profiles_wilaya_code_fkey"
      columns: ["wilaya_code"]
isOneToOne: false
      referencedRelation: "wilayas"
      referencedColumns: ["code"]
    }
                  ]
                },"tree_like_counts": {
                  Row: {
                    "likes": number | null,"tree_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "tree_likes_tree_id_fkey"
      columns: ["tree_id"]
isOneToOne: false
      referencedRelation: "trees"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "activate_crisis":
{ Args: { "sms_template": string,"t": Database["public"]['Enums']["crisis_type"],"title": string,"wilaya": number }; Returns: string
                           },
"alert_wilaya":
{ Args: { "a": string }; Returns: number
                           },
"can_administer":
{ Args: { "w": number }; Returns: boolean
                           },
"can_moderate":
{ Args: { "w": number }; Returns: boolean
                           },
"can_see_alert_contact":
{ Args: { "a": string }; Returns: boolean
                           },
"cancel_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"check_in":
{ Args: { "activity": string,"hours"?: number,"token": string }; Returns: Json
                           },
"close_crisis":
{ Args: { "crisis": string,"report": string }; Returns: undefined
                           },
"confirm_alert_volunteer":
{ Args: { "alert": string,"confirmed": boolean,"hours"?: number,"volunteer": string }; Returns: undefined
                           },
"confirm_crisis_availability":
{ Args: { "crisis": string }; Returns: undefined
                           },
"create_club":
{ Args: { "description"?: string,"focus"?: (Database["public"]['Enums']["alert_category"])[],"institution_name"?: string,"name": string,"wilaya": number }; Returns: string
                           },
"export_my_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"find_user_by_email":
{ Args: { "email": string }; Returns: {
              "display_name": string,"id": string,"wilaya_code": number
            }[]
                           },
"get_alert_contact":
{ Args: { "alert": string }; Returns: string
                           },
"grant_role":
{ Args: { "r": Database["public"]['Enums']["app_role"],"target": string,"wilaya"?: number }; Returns: undefined
                           },
"has_role":
{ Args: { "r": Database["public"]['Enums']["app_role"] }; Returns: boolean
                           },
"impact_stats":
{ Args: { "p_from"?: string,"p_to"?: string,"p_wilaya"?: number }; Returns: Json
                           },
"is_club_lead":
{ Args: { "c": string }; Returns: boolean
                           },
"is_ministry":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_staff":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"issue_certificate":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"issue_qr_token":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"join_alert":
{ Args: { "alert": string }; Returns: Json
                           },
"leaderboard":
{ Args: { "lim"?: number,"wilaya"?: number }; Returns: {
              "display_name": string,"points": number,"user_id": string,"wilaya_code": number
            }[]
                           },
"leave_alert":
{ Args: { "alert": string }; Returns: undefined
                           },
"match_active_alerts":
{ Args: { "p_category": Database["public"]['Enums']["alert_category"],"p_days"?: number,"p_embedding"?: string,"p_limit"?: number,"p_phone_hashes": (string)[],"p_text": string,"p_wilaya": number }; Returns: {
              "category": Database["public"]['Enums']["alert_category"],"created_at": string,"id": string,"phone_match": boolean,"same_category": boolean,"same_place": boolean,"status": Database["public"]['Enums']["alert_status"],"text_similarity": number,"title": string,"vector_similarity": number,"wilaya_code": number
            }[]
                           },
"match_historical":
{ Args: { "p_embedding"?: string,"p_hash": string,"p_limit"?: number,"p_phone_hashes": (string)[],"p_text": string }; Returns: {
              "category": Database["public"]['Enums']["alert_category"],"exact": boolean,"first_seen_at": string,"id": string,"normalized_text": string,"phone_match": boolean,"resolved_at": string,"text_similarity": number,"times_seen": number,"vector_similarity": number,"wilaya_code": number
            }[]
                           },
"my_moderation_scope":
{ Args: Record<PropertyKey, never>; Returns: (number)[]
                           },
"my_points":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"portal_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"rate_limit_hit":
{ Args: { "k": string,"max_hits": number,"window_seconds": number }; Returns: boolean
                           },
"request_account_deletion":
{ Args: { "reason"?: string }; Returns: string
                           },
"review_alert":
{ Args: { "action": string,"alert": string,"merge_target"?: string,"note"?: string }; Returns: Database["public"]['Enums']["alert_status"]
                           },
"review_report":
{ Args: { "approve": boolean,"report": string }; Returns: undefined
                           },
"review_tree":
{ Args: { "approve": boolean,"note"?: string,"tree": string }; Returns: undefined
                           },
"revoke_role":
{ Args: { "r": Database["public"]['Enums']["app_role"],"target": string }; Returns: undefined
                           },
"submit_report":
{ Args: { "activity"?: string,"alert"?: string,"attended_count": number,"hours_total": number,"organization"?: string,"outcome": string,"resources_used"?: string }; Returns: string
                           },
"verify_certificate":
{ Args: { "cert": string }; Returns: Json
                           }
          }
          Enums: {
            "ai_verdict": "fresh"|"recycled"|"duplicate"|"low-confidence","alert_category": "blood"|"relief"|"cleanup"|"orphans"|"medical"|"education","alert_status": "pending"|"approved"|"rejected"|"resolved"|"recycled"|"merged"|"expired","app_role": "volunteer"|"club_lead"|"association"|"moderator"|"djsl_admin"|"ministry_admin","availability": "weekends"|"evenings"|"anytime","blood_type": "O-"|"O+"|"A-"|"A+"|"B-"|"B+"|"AB-"|"AB+","crisis_type": "flood"|"earthquake"|"fire"|"cold"|"other","institution_kind": "youth_house"|"youth_center"|"hospital"|"blood_center"|"school"|"civil_protection"|"other","intake_channel": "web_form"|"telegram"|"whatsapp"|"rss"|"moderator_paste"|"api","intake_status": "queued"|"processing"|"processed"|"failed"|"rejected"|"spam","review_status": "pending"|"approved"|"rejected","urgency": "critical"|"medium"|"normal","volunteer_status": "joined"|"confirmed"|"no_show"|"cancelled"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "ai_verdict": ["fresh", "recycled", "duplicate", "low-confidence"],"alert_category": ["blood", "relief", "cleanup", "orphans", "medical", "education"],"alert_status": ["pending", "approved", "rejected", "resolved", "recycled", "merged", "expired"],"app_role": ["volunteer", "club_lead", "association", "moderator", "djsl_admin", "ministry_admin"],"availability": ["weekends", "evenings", "anytime"],"blood_type": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],"crisis_type": ["flood", "earthquake", "fire", "cold", "other"],"institution_kind": ["youth_house", "youth_center", "hospital", "blood_center", "school", "civil_protection", "other"],"intake_channel": ["web_form", "telegram", "whatsapp", "rss", "moderator_paste", "api"],"intake_status": ["queued", "processing", "processed", "failed", "rejected", "spam"],"review_status": ["pending", "approved", "rejected"],"urgency": ["critical", "medium", "normal"],"volunteer_status": ["joined", "confirmed", "no_show", "cancelled"]
          }
        }
} as const

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useJobPositionsForCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["job-positions", "company", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_positions" as any)
        .select("*, job_position_topics(topic_id, topics:topic_id(id, name, slug)), job_position_territories(territory_id, territories:territory_id(id, name))")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!companyId,
  });
}

export function useAllJobPositions() {
  return useQuery({
    queryKey: ["job-positions", "all"],
    queryFn: async () => {
      // Fetch jobs with company + topic/territory joins (no FK to profiles for creator)
      const { data: jobs, error } = await supabase
        .from("job_positions" as any)
        .select("*, companies:company_id(id, name, logo_url), job_position_topics(topic_id, topics:topic_id(id, name, slug)), job_position_territories(territory_id, territories:territory_id(id, name))")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch creator profiles separately
      const creatorIds = [...new Set((jobs as any[]).map((j: any) => j.created_by_user_id).filter(Boolean))];
      let creatorsMap: Record<string, any> = {};
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", creatorIds);
        if (profiles) {
          for (const p of profiles) {
            creatorsMap[p.user_id] = { id: p.user_id, name: p.name, avatar_url: p.avatar_url };
          }
        }
      }

      return (jobs as any[]).map((j: any) => ({
        ...j,
        creator: creatorsMap[j.created_by_user_id] || null,
      }));
    },
  });
}

export function useCreateJobPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      company_id?: string;
      created_by_user_id: string;
      title: string;
      description?: string;
      organization_name?: string;
      contract_type: string;
      location_text?: string;
      remote_policy?: string;
      salary_min?: number;
      salary_max?: number;
      salary_currency?: string;
      document_url?: string;
      document_name?: string;
      topic_ids?: string[];
      territory_ids?: string[];
    }) => {
      const { topic_ids, territory_ids, ...jobData } = params;
      const { data, error } = await supabase
        .from("job_positions" as any)
        .insert(jobData as any)
        .select()
        .single();
      if (error) throw error;

      const jobId = (data as any).id;

      if (topic_ids?.length) {
        const { error: topicErr } = await supabase
          .from("job_position_topics" as any)
          .insert(topic_ids.map(tid => ({ job_position_id: jobId, topic_id: tid })) as any);
        if (topicErr) throw topicErr;
      }

      if (territory_ids?.length) {
        const { error: terrErr } = await supabase
          .from("job_position_territories" as any)
          .insert(territory_ids.map(tid => ({ job_position_id: jobId, territory_id: tid })) as any);
        if (terrErr) throw terrErr;
      }

      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["job-positions", "company", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["job-positions", "all"] });
    },
  });
}

export function useUpdateJobPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      company_id?: string;
      title: string;
      description?: string;
      organization_name?: string;
      contract_type: string;
      location_text?: string;
      remote_policy?: string;
      document_url?: string;
      document_name?: string;
      topic_ids?: string[];
      territory_ids?: string[];
    }) => {
      const { id, topic_ids, territory_ids, ...jobData } = params;
      const { error } = await supabase
        .from("job_positions" as any)
        .update(jobData as any)
        .eq("id", id);
      if (error) throw error;

      // Replace topics
      await supabase.from("job_position_topics" as any).delete().eq("job_position_id", id);
      if (topic_ids?.length) {
        const { error: topicErr } = await supabase
          .from("job_position_topics" as any)
          .insert(topic_ids.map(tid => ({ job_position_id: id, topic_id: tid })) as any);
        if (topicErr) throw topicErr;
      }

      // Replace territories
      await supabase.from("job_position_territories" as any).delete().eq("job_position_id", id);
      if (territory_ids?.length) {
        const { error: terrErr } = await supabase
          .from("job_position_territories" as any)
          .insert(territory_ids.map(tid => ({ job_position_id: id, territory_id: tid })) as any);
        if (terrErr) throw terrErr;
      }

      return params;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["job-positions", "company", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["job-positions", "all"] });
    },
  });
}

export function useDeleteJobPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from("job_positions" as any)
        .update({ is_active: false } as any)
        .eq("id", id);
      if (error) throw error;
      return companyId;
    },
    onSuccess: (companyId) => {
      qc.invalidateQueries({ queryKey: ["job-positions", "company", companyId] });
      qc.invalidateQueries({ queryKey: ["job-positions", "all"] });
    },
  });
}

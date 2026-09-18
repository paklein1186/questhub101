import { useMemo } from "react";
import { useAllJobPositions } from "@/hooks/useJobPositions";
import { useQuests, useServices, useCourses } from "@/hooks/useSupabaseData";
import { QuestStatus } from "@/types/enums";
import { isMission } from "@/lib/questTypes";

export type OpportunityType = "MISSION" | "JOB" | "SERVICE" | "COURSE";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string | null;
  url: string;
  topics: { id: string; name: string }[];
  territories: { id: string; name: string }[];
  topicIds: string[];
  territoryIds: string[];
  priceLabel: string | null;
  isFree: boolean;
  ownerName: string | null;
  ownerLogoUrl: string | null;
  createdAt: string;
  updatedAt: string | null;
  raw: any;
}

const OPEN_MISSION_STATUSES: string[] = [QuestStatus.OPEN, QuestStatus.OPEN_FOR_PROPOSALS, QuestStatus.ACTIVE];

/**
 * Aggregates the four independent "I'm looking for X" surfaces — funded quests,
 * job postings, services and courses — into one normalized list, so a single
 * page can let Fondation/Acteur public/Entreprise/Consultant personas browse
 * by intent instead of by internal vocabulary (see Handbook §15).
 */
export function useOpportunities() {
  const jobsQuery = useAllJobPositions();
  const questsQuery = useQuests();
  const servicesQuery = useServices();
  const coursesQuery = useCourses();

  const isLoading = jobsQuery.isLoading || questsQuery.isLoading || servicesQuery.isLoading || coursesQuery.isLoading;

  const opportunities = useMemo<Opportunity[]>(() => {
    const items: Opportunity[] = [];

    for (const job of (jobsQuery.data ?? []) as any[]) {
      const topics = (job.job_position_topics ?? []).map((jt: any) => jt.topics).filter(Boolean);
      const territories = (job.job_position_territories ?? []).map((jt: any) => jt.territories).filter(Boolean);
      const hasSalary = job.salary_min || job.salary_max;
      items.push({
        id: `job-${job.id}`,
        type: "JOB",
        title: job.title,
        description: job.description ?? null,
        url: "/jobs",
        topics,
        territories,
        topicIds: topics.map((t: any) => t.id),
        territoryIds: territories.map((t: any) => t.id),
        priceLabel: hasSalary
          ? `${job.salary_min ?? "?"}–${job.salary_max ?? "?"} ${job.salary_currency ?? ""}`.trim()
          : null,
        isFree: false,
        ownerName: job.companies?.name ?? job.organization_name ?? job.creator?.name ?? null,
        ownerLogoUrl: job.companies?.logo_url ?? null,
        createdAt: job.created_at,
        updatedAt: job.updated_at ?? null,
        raw: job,
      });
    }

    for (const quest of (questsQuery.data ?? []) as any[]) {
      if (quest.is_draft) continue;
      if (!isMission(quest)) continue;
      if (!OPEN_MISSION_STATUSES.includes(quest.status)) continue;
      const territories = (quest.quest_territories ?? []).map((qt: any) => qt.territories).filter(Boolean);
      const hasBudget = quest.mission_budget_min || quest.mission_budget_max;
      items.push({
        id: `mission-${quest.id}`,
        type: "MISSION",
        title: quest.title,
        description: quest.description ?? null,
        url: `/quests/${quest.id}`,
        topics: [],
        territories,
        topicIds: (quest.quest_topics ?? []).map((qt: any) => qt.topic_id),
        territoryIds: territories.map((t: any) => t.id),
        priceLabel: hasBudget
          ? `${quest.mission_budget_min ?? "?"}–${quest.mission_budget_max ?? "?"}`
          : null,
        isFree: false,
        ownerName: quest.guilds?.name ?? null,
        ownerLogoUrl: null,
        createdAt: quest.created_at,
        updatedAt: quest.updated_at ?? null,
        raw: quest,
      });
    }

    for (const service of (servicesQuery.data ?? []) as any[]) {
      if (service.is_draft || service.is_active === false) continue;
      const topics = (service.service_topics ?? []).map((st: any) => st.topics).filter(Boolean);
      const territories = (service.service_territories ?? []).map((st: any) => st.territories).filter(Boolean);
      const isFree = !service.price_amount || Number(service.price_amount) === 0;
      items.push({
        id: `service-${service.id}`,
        type: "SERVICE",
        title: service.title,
        description: service.description ?? null,
        url: `/services/${service.id}`,
        topics,
        territories,
        topicIds: topics.map((t: any) => t.id),
        territoryIds: territories.map((t: any) => t.id),
        priceLabel: isFree ? null : `${service.price_amount} ${service.price_currency ?? ""}`.trim(),
        isFree,
        ownerName: service.guilds?.name ?? service.provider_profile?.name ?? null,
        ownerLogoUrl: service.guilds?.logo_url ?? null,
        createdAt: service.created_at,
        updatedAt: service.updated_at ?? null,
        raw: service,
      });
    }

    for (const course of (coursesQuery.data ?? []) as any[]) {
      const topics = (course.course_topics ?? []).map((ct: any) => ct.topics).filter(Boolean);
      items.push({
        id: `course-${course.id}`,
        type: "COURSE",
        title: course.title,
        description: course.description ?? null,
        url: `/courses/${course.id}`,
        topics,
        territories: [],
        topicIds: topics.map((t: any) => t.id),
        territoryIds: [],
        priceLabel: course.is_free ? null : `${course.price_amount ?? ""} ${course.price_currency ?? ""}`.trim(),
        isFree: !!course.is_free,
        ownerName: null,
        ownerLogoUrl: null,
        createdAt: course.created_at,
        updatedAt: course.updated_at ?? null,
        raw: course,
      });
    }

    return items;
  }, [jobsQuery.data, questsQuery.data, servicesQuery.data, coursesQuery.data]);

  return { opportunities, isLoading };
}

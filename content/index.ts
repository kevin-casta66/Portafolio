import type { RawContent } from "@/lib/content/schema";
import { experience } from "./experience";
import { experiments } from "./experiments";
import { profile } from "./profile";
import { projects } from "./projects";
import { skills } from "./skills";

/** Contenido sin validar. Usa `@/lib/content` para obtenerlo validado y con relaciones derivadas. */
export const rawContent: RawContent = { profile, skills, projects, experience, experiments };

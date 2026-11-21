import bab01 from "@/data/modules/bab-01.json";
import bab02 from "@/data/modules/bab-02.json";
import bab03 from "@/data/modules/bab-03.json";
import bab04 from "@/data/modules/bab-04.json";
import bab05 from "@/data/modules/bab-05.json";
import bab06 from "@/data/modules/bab-06.json";
import bab07 from "@/data/modules/bab-07.json";
import bab08 from "@/data/modules/bab-08.json";
import bab09 from "@/data/modules/bab-09.json";
import bab10 from "@/data/modules/bab-10.json";
import { ModuleData } from "./types";

export const ALL_MODULES: ModuleData[] = [
  bab01,
  bab02,
  bab03,
  bab04,
  bab05,
  bab06,
  bab07,
  bab08,
  bab09,
  bab10,
] as ModuleData[];

export function getModuleById(id: string): ModuleData | undefined {
  return ALL_MODULES.find((m) => m.id === id);
}

export function getModulesBySemester(semester: "Ganjil" | "Genap"): ModuleData[] {
  return ALL_MODULES.filter((m) => m.semester === semester);
}

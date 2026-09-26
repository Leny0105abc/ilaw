import { Competency, GradeLevel, LearningArea, Term } from "@/types/lesson-plan";
import supplementalRaw from "./supplemental-curriculum.json";

const rows: Array<[GradeLevel, Term, number[], LearningArea, string[]]> = [
  [7,1,[1],"Agriculture and Fishery Arts",["Discuss career and business opportunities in agriculture.","Differentiate agricultural tools, implements, and equipment."]],
  [7,1,[2],"Agriculture and Fishery Arts",["Identify different tools and equipment used in agriculture.","Discuss safety procedures in farm operations."]],
  [7,1,[3,4],"Agriculture and Fishery Arts",["Discuss hazards and risks in farm operations.","Perform agricultural practices in crop production."]],
  [7,1,[5],"Agriculture and Fishery Arts",["Discuss care and maintenance of crops.","Explain farm waste processing."]],
  [7,1,[6,7],"Agriculture and Fishery Arts",["Perform basket composting and foliar fertilizer fermentation.","Discuss harvesting and post-harvesting practices."]],
  [7,1,[7,8,9,10],"Agriculture and Fishery Arts",["Determine the breeds of farm animals.","Determine poultry and livestock materials, tools, and equipment and their uses based on industry standards.","Illustrate housing requirements for poultry and livestock based on industry standards.","Discuss feeding management according to the Philippine National Standard (PNS) for poultry and livestock animals.","Discuss farm waste management in poultry and livestock production according to Republic Act No 9003 or the Ecological Solid Waste Management Act of 2000.","Identify products and by products of poultry and livestock production."]],
  [7,2,[1],"Family and Consumer Science",["Differentiate hospitality and tourism.","Distinguish the types and forms of tourism and the kinds of tourists."]],
  [7,2,[2],"Family and Consumer Science",["Explain the scope of the hospitality industry.","Identify career and business opportunities in the hotel and tourism industry."]],
  [7,2,[3],"Family and Consumer Science",["Examine the issues, challenges, trends, and innovations in the hospitality and tourism industry."]],
  [7,2,[4],"Family and Consumer Science",["Discuss the fundamentals of food preparation and service."]],
  [7,2,[5],"Family and Consumer Science",["Recognize the seven principles of HACCP in food preparation and service."]],
  [7,2,[6],"Family and Consumer Science",["Identify the common tools and equipment used in food preparation and service industry."]],
  [7,2,[7],"Family and Consumer Science",["Discuss the care and maintenance of tools and equipment used in food preparation and service industry."]],
  [7,2,[8],"Family and Consumer Science",["Demonstrate table napkin folds."]],
  [7,2,[9],"Family and Consumer Science",["Discuss the principles of food selections and preparation."]],
  [7,2,[10],"Family and Consumer Science",["Convert units of measurement."]],
  [7,3,[1],"Industrial Arts",["Discuss the services in industrial arts."]],
  [7,3,[2],"Industrial Arts",["Determine career and business opportunities in industrial arts."]],
  [7,3,[2,3],"Industrial Arts",["Discuss the codes and standards for industrial arts services."]],
  [7,3,[4,5],"Industrial Arts",["Identify the uses and maintenance of hand tools, power tools, instruments, and equipment."]],
  [7,3,[6,7,8],"Industrial Arts",["Interpret the readings in different measuring instruments."]],
  [7,3,[8,9,10],"Industrial Arts",["Demonstrate measurement and calculations following safety precautions."]],
  [8,1,[1],"Agriculture and Fishery Arts",["Discuss the background of aquaculture and its relation to fisheries.","Discuss career and business opportunities related to fisheries.","Discuss the phases of fish culture.","Identify common fishes according to their habitat."]],
  [8,1,[2],"Agriculture and Fishery Arts",["Familiarize themselves with sections of RA. 10654.","Discuss fish species in the Philippines.","Discuss Occupational Safety and Health (OSH) hazards in fisheries.","Discuss advantages and disadvantages of organic aquaculture."]],
  [8,1,[3],"Agriculture and Fishery Arts",["Identify different aquaculture methods and selected practices.","Determine the area and depth requirement of aquaculture facilities."]],
  [8,1,[4],"Agriculture and Fishery Arts",["Discuss the uses of tools and equipment in aquaculture.","Identify fishing gears used for catching fish."]],
  [8,1,[5],"Agriculture and Fishery Arts",["Create a simple hand line following safety precautions."]],
  [8,1,[6],"Agriculture and Fishery Arts",["Discuss basic fishing bait methods.","Discuss post-harvest handling activities."]],
  [8,1,[7],"Agriculture and Fishery Arts",["Perform sorting, grading, and storing of fishes following safety precautions."]],
  [8,1,[8],"Agriculture and Fishery Arts",["Discuss the importance of food processing.","Discuss opportunities for food processing as a career and as a business.","Discuss different raw materials used in food processing.","Explain the ingredients used for food processing."]],
  [8,1,[9],"Agriculture and Fishery Arts",["Discuss different methods in food processing following industry standards.","Discuss different tools and equipment, uses, and maintenance in food processing."]],
  [8,1,[10],"Agriculture and Fishery Arts",["Perform quantification procedures in processing food.","Discuss different packaging materials used in food processing.","Develop sample label design for processed food products."]],
  [8,2,[1],"Family and Consumer Science",["Discuss the concepts of beauty care and wellness services.","Identify the structures of nail, skin, and hair.","Identify career and business opportunities in beauty care and wellness services."]],
  [8,2,[2],"Family and Consumer Science",["Discuss the legal basis in beauty care and wellness services.","Identify trends, issues, and challenges in beauty care and wellness services."]],
  [8,2,[3],"Family and Consumer Science",["Identify tools, implements, materials, and equipment in beauty care and wellness services.","Discuss sanitation and maintenance in the workplace, tools, implements, materials, and equipment.","Discuss the Occupational Safety and Health (OSH) practices in beauty care and wellness services."]],
  [8,2,[4],"Family and Consumer Science",["Perform hand spa services following safety precautions."]],
  [8,2,[5],"Family and Consumer Science",["Discuss the concepts in making garments.","Identify supplies and materials used for making garments."]],
  [8,2,[6,7,8],"Family and Consumer Science",["Apply the principles of pattern drafting in making garments following safety precautions.","Discuss the concepts in making handicrafts.","Identify supplies and materials used for making handicrafts."]],
  [8,2,[9,10],"Family and Consumer Science",["Apply the principles in making handicrafts following safety precautions."]],
  [8,3,[1],"Industrial Arts",["Explain signs and symbols for construction services, electrical services, electronics services, and automotive and small engine services."]],
  [8,3,[2],"Industrial Arts",["Discuss the types of manuals used in industrial arts services."]],
  [8,3,[3],"Industrial Arts",["Discuss the consumables in industrial arts services."]],
  [8,3,[4],"Industrial Arts",["Discuss the component parts of industrial arts services."]],
  [8,3,[5],"Industrial Arts",["Discuss simple diagnostics in industrial arts services."]],
  [8,3,[6,7,8,9],"Industrial Arts",["Perform simple troubleshooting in industrial arts services."]],
  [8,3,[10],"Industrial Arts",["Discuss repair service cost in industrial arts."]],
];

const coreCompetencies: Competency[] = rows.flatMap(([grade, term, weeks, area, texts], rowIndex) =>
  texts.map((text, textIndex) => ({ id: `g${grade}-t${term}-r${rowIndex}-${textIndex}`, grade, term, weeks, area, text, source: `Grade ${grade} TLE AFA/FCS/IA Budget of Work` }))
);

const supplementalCompetencies = (supplementalRaw as Omit<Competency, "id">[]).map((item, index) => ({ ...item, id: `supplemental-${index}` }));

export const competencies: Competency[] = [...coreCompetencies, ...supplementalCompetencies];

export const areaAbbreviation: Record<Competency["area"], string> = {
  "Agriculture and Fishery Arts": "AFA",
  "Family and Consumer Science": "FCS",
  "Industrial Arts": "IA",
  "Information and Communications Technology": "ICT",
  "ICT - Computer Programming": "ICT-CP",
  "ICT - Computer Systems Servicing": "ICT-CSS",
  "Good Manners and Right Conduct": "GMRC",
};

export function termLabel(term: Term) {
  return term === "one-term" ? "One Term" : `${["", "First", "Second", "Third"][term]} Term`;
}

export function learningAreaLabel(grade: GradeLevel, area: LearningArea) {
  return area === "Good Manners and Right Conduct" ? `GMRC ${grade}` : `TLE ${grade} ${areaAbbreviation[area]}`;
}

export function learningAreaOptionLabel(area: LearningArea) {
  if (area === "Good Manners and Right Conduct") return "GMRC";
  if (area === "Information and Communications Technology") return "TLE – ICT";
  if (area === "ICT - Computer Programming") return "TLE – ICT: Computer Programming";
  if (area === "ICT - Computer Systems Servicing") return "TLE – ICT: Computer Systems Servicing";
  return `TLE – ${area}`;
}

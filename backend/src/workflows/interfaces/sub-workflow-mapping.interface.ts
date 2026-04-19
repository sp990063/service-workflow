export enum SubWorkflowMappingMode {
  INHERIT = 'inherit',
  EXTRACT = 'extract',
  TRANSFORM = 'transform',
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: string;
}

export interface SubWorkflowMappingConfig {
  mode: SubWorkflowMappingMode;
  mappings?: FieldMapping[];
  filterFields?: string[];
}
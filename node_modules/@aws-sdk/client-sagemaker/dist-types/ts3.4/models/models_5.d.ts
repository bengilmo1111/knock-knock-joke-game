import { BooleanOperator } from "./models_0";
import { CrossAccountFilterOption } from "./models_2";
import { Filter, ResourceType, Workteam } from "./models_3";
import {
  NestedFilters,
  SearchSortOrder,
  VisibilityConditions,
} from "./models_4";
export interface UpdateWorkteamResponse {
  Workteam: Workteam | undefined;
}
export interface SearchExpression {
  Filters?: Filter[];
  NestedFilters?: NestedFilters[];
  SubExpressions?: SearchExpression[];
  Operator?: BooleanOperator;
}
export interface SearchRequest {
  Resource: ResourceType | undefined;
  SearchExpression?: SearchExpression;
  SortBy?: string;
  SortOrder?: SearchSortOrder;
  NextToken?: string;
  MaxResults?: number;
  CrossAccountFilterOption?: CrossAccountFilterOption;
  VisibilityConditions?: VisibilityConditions[];
}

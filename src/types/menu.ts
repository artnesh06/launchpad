export interface MenuData {
  id: string;
  name: string;
  type: string;
  url?: string;
  icon?: string;
  parentId?: string;
  groupMenuId?: string;
  sequence?: number;
  description?: string;
  shortcut?: string;
}

export interface MenuUpdateData {
  name?: string;
  type?: string;
  url?: string;
  icon?: string;
  parentId?: string;
  groupMenuId?: string;
  sequence?: number;
  enableStatus?: 'Y' | 'N';
  description?: string;
  shortcut?: string;
}

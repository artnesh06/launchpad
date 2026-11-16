export interface RespPermittedMenu {
  groupMenu: GroupNavItem;
  menus: NavItem[];
}

export interface GroupNavItem {
  color: string;
  description: string;
  enableStatus: string;
  icon: string;
  id: string;
  name: string;
  sequence: number;
}

export interface NavItem {
  id: string;
  name: string;
  url: string;
  type: string;
  sequence?: number;
  groupMenuId?: string;
  parentId?: string;
  disabled?: boolean;
  external?: boolean;
  shortcut?: [string, string];
  icon?: string;
  description?: string;
  children?: NavItem[];
  isActive?: boolean;
}

export interface NavItemWithChildren extends NavItem {
  items: NavItemWithChildren[];
}

export interface NavItemWithOptionalChildren extends NavItem {
  items?: NavItemWithChildren[];
}

export interface FooterItem {
  title: string;
  items: {
    title: string;
    href: string;
    external?: boolean;
  }[];
}

export type MainNavItem = NavItemWithOptionalChildren;

export type SidebarNavItem = NavItemWithChildren;

export interface ApiConfig {
  [serviceName: string]: {
    endpoint: string;
    endpointSsl: string;
    paths: {
      [pathKey: string]: string | { [nestedPathKey: string]: string };
    };
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

  // Header Entry Type for System Form
  export interface HeaderEntry {
    id: string;
    key: string;
    value: string;
  }

  // System Types
  export type SystemItem = {
    id?: number;
    nama: string;
    url: string;
    destination: string;
    typeApi: string;
    status: boolean;
    createdAt?: string;
    updatedAt?: string;
    headers: string | HeaderEntry[];
    token: string | null;
    ip_whitelist?: string | string[];
  };

  // Menu Types
    export type MenuItem = {
        id?: number;
        isSidebar: boolean;
        nama: string;
        fitur: string;
        pathMenu: string;
        noMenu?: number;
        group_menu?: {
            id?: number;
            nama: string;
            sistem?: {
            id?: number;
            nama: string;
            };
        } | number;  
        baseurl?: string;
        createdBy?: string | null;
        updatedBy?: string | null;
        createdAt?: string;
        updatedAt?: string;
    };

  // Menu Group Types
    export type MenuGroupItem = {
        id?: number;
        nama: string;
        idSistem?: string;
        status?: boolean;
        isAdministrator?: boolean;
        sistem?: {
            nama: string;
        };
        createdAt?: string;
        updatedAt?: string;
        createdBy?: string;
        updatedBy?: string;
        value?: string;
        label?: string;
    };

  

  // Account Group Types
    export type AccGroupItem = {
        id?: number;
        namaGroup?: string;
        codeGroup?: string | { id?: number; nama?: string };
        idSistem?: string | number;
        isAdministrator?: boolean;
        status?: boolean;
        createdBy?: string;
        updatedBy?: string;
        createdAt?: string;
        updatedAt?: string;
        [key: string]: unknown;
    };

      // Account Types
    export interface AccountItem {
        id?: number;
        nipp?: string;
        username?: string;
        email?: string;
        [key: string]: unknown;
    };

    export interface FiturItem {
        id?: number;
        nama?: string;
        code?: string;
        menu: string;
        route: string;
        urutan: string;
        idSistem: number | { id: number; nama: string };
        icon: string;
        showFiture: string;
        status: boolean;
        createdBy?: string | null;
        updatedBy?: string | null;
        createdAt?: string;
        updatedAt?: string;
        [key: string]: unknown;
    }
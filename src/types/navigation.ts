export interface NavMenuItem {
  key: string;
  label: string;
  icon: string;
  to: string;
  group: string;
  desc: string;
}

export interface NavGroup {
  title: string;
  keys: string[];
}

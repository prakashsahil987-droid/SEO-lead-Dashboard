export type ContactPoint = {value: string; source: string};
export type SocialProfile = {platform: string; url: string; source: string};
export type PublicContacts = {
  emails: ContactPoint[];
  phones: ContactPoint[];
  socials: SocialProfile[];
  warnings: string[];
  checkedAt: string;
};
export type Lead={id:string,name:string,location:string,website:string|null,rating:number|null,reviews:number|null,email:string|null,score:number,opportunity:string,findings:string[],mapsUrl?:string|null,phone?:string|null,types?:string[],rank?:number,source?:string,publicContacts?:PublicContacts};
export type DiscoverySource = 'auto' | 'google' | 'osm' | 'openstreetmap';

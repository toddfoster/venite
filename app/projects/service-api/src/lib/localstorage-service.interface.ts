export interface LocalStorageServiceInterface {
  get : (key : string) => any;
  set : (key : string, value : any) => any;
}
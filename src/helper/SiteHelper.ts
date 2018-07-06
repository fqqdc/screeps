export const SiteHelper = {
    IsConstructionSite: function (structure: Structure): boolean {
        return structure instanceof ConstructionSite;
    }
}

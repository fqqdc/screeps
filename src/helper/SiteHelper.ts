export const SiteHelper = {
    IsConstructionSite: function (structure: AnyStructure|ConstructionSite): boolean {
        return structure instanceof ConstructionSite;
    }
}

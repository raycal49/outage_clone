namespace OutageMap.Server.Services;

public sealed class OutageSyncResult
{
    public int Added { get; set; }
    public int Updated { get; set; }
    public int Deactivated { get; set; }

    public bool HasChanges =>
        Added > 0 ||
        Updated > 0 ||
        Deactivated > 0;
}

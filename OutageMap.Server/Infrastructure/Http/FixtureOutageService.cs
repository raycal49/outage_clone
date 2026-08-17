using OutageMap.Server.Dtos;
using System.Text.Json;

namespace OutageMap.Server.Infrastructure.Http;

public class FixtureOutageService : IOutageSource
{
    private readonly string _fixturePath;

    public FixtureOutageService(IWebHostEnvironment env)
    {
        _fixturePath = Path.Combine(env.ContentRootPath, "Fixtures", "events.json");
    }

    public async Task<List<OutageDto>> GetOutageData()
    {
        await using var stream = File.OpenRead(_fixturePath);
        var data = await JsonSerializer.DeserializeAsync<List<OutageDto>>(stream);
        return data ?? [];
    }
}
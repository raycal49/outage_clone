using OutageMap.Server.Dtos;
using System.Text.Json;

namespace OutageMap.Server.Infrastructure.Http;

public class FixtureOutageService : IOutageService
{
    private readonly string _fixturePath;

    public FixtureOutageService(IWebHostEnvironment env)
    {
        _fixturePath = Path.Combine(env.ContentRootPath, "Fixtures", "events.json");
    }

    public async Task<List<OutageDataDto>> GetOutageData()
    {
        await using var stream = File.OpenRead(_fixturePath);
        var data = await JsonSerializer.DeserializeAsync<List<OutageDataDto>>(stream);
        return data ?? [];
    }
}
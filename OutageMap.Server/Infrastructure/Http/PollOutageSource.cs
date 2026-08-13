using Microsoft.AspNetCore.WebUtilities;
using OutageMap.Server.Dtos;
using System.Text.Json;

namespace OutageMap.Server.Infrastructure.Http;

public class PollOutageSource : IOutageSource
{
    private readonly HttpClient _httpClient;

    public PollOutageSource(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<List<OutageDto>> GetOutageData()
    {
        var response = await _httpClient.GetAsync(_httpClient.BaseAddress);

        if (response.IsSuccessStatusCode == false)
        {
            var statusCode = (int)response.StatusCode;
            var codeDescription = ReasonPhrases.GetReasonPhrase(statusCode);

            throw new HttpRequestException($"HTTP Error {statusCode}: {codeDescription}");
        }

        var json = await response.Content.ReadAsStringAsync();

        var dataDto = JsonSerializer.Deserialize<List<OutageDto>>(json);

        return dataDto;
    }
}

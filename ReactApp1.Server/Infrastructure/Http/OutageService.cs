using Microsoft.AspNetCore.WebUtilities;
using NetTopologySuite.Features;
using ReactApp1.Server.Dtos;
using ReactApp1.Server.Models;
using System.Text.Json;

namespace ReactApp1.Server.Infrastructure.Http
{
    public class OutageService : IOutageService
    {
        private readonly HttpClient _httpClient;

        public OutageService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<List<OutageDataDto>> GetOutageData()
        {
            var response = await _httpClient.GetAsync(_httpClient.BaseAddress);

            if (response.IsSuccessStatusCode == false)
            {
                var statusCode = (int)response.StatusCode;
                var codeDescription = ReasonPhrases.GetReasonPhrase(statusCode);

                throw new HttpRequestException($"HTTP Error {statusCode}: {codeDescription}");
            }

            var json = await response.Content.ReadAsStringAsync();

            var dataDto = JsonSerializer.Deserialize<List<OutageDataDto>>(json);

            return dataDto;
        }
    }
}

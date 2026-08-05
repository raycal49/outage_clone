using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using ReactApp1.Server.Dtos;
using System.Text.Json;
using Xunit.Sdk;

namespace ReactApp1.Server.Infrastructure.Http
{
    public class DirectionsService : IDirectionsService
    {
        private readonly HttpClient _httpClient;
        private readonly string _token;

        public DirectionsService(HttpClient httpClient, IOptions<MapboxOptions> MapboxOpts)
        {
            _httpClient = httpClient;
            _token = MapboxOpts.Value.MapboxToken;
        }

        public async Task<DirectionsResponseDto> GetDirections(string coordinates)
        {
            var queryString = new Dictionary<string, string?>()
            {
                ["access_token"] = _token,
                ["geometries"] = "geojson",
                ["overview"] = "full",
                ["annotations"] = "duration,distance,speed,congestion,congestion_numeric",
                ["steps"] = "true",
            };

            var url = QueryHelpers.AddQueryString(coordinates, queryString);

            var response = await _httpClient.GetAsync(url);
            if (response.IsSuccessStatusCode == false)
            {
                var responseBody = await response.Content.ReadFromJsonAsync<System.Text.Json.Nodes.JsonObject>();
                var message = responseBody!["message"]!.ToString();
                throw new HttpRequestException(message);
            }

            var dto = await response.Content.ReadFromJsonAsync<DirectionsResponseDto>();

            return dto;
        }

    }
}    

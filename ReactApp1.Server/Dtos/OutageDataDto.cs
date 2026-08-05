using System.Text.Json;
using System.Text.Json.Serialization;

namespace ReactApp1.Server.Dtos
{
    public class OutageDataDto
    {
        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }

        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }

        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("startTime")]
        public long StartTime  { get; set; }

        [JsonPropertyName("lastUpdatedTime")]
        public long LastUpdatedTime { get; set; }

        [JsonPropertyName("etrTime")]
        public long? EtrTime { get; set; }

        [JsonPropertyName("numPeople")]
        public int NumPeople { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("cause")]
        public string? Cause { get; set; }

        [JsonPropertyName("identifier")]
        public string? identifier { get; set; }

        [JsonPropertyName("additionalProperties")]
        public List<Properties>? AdditionalProperties { get; set; }

    }

    public sealed class Properties
    {
        [JsonPropertyName("property")]
        public string? Property {  get; init; }

        [JsonPropertyName("value")]
        public JsonElement? Value { get; init; }
    }
}

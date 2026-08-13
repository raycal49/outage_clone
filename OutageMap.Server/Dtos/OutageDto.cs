using System.Text.Json;
using System.Text.Json.Serialization;

namespace OutageMap.Server.Dtos;

public class OutageDto
{
    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }

    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("startTime")]
    public long StartTime { get; set; }

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
    public string? Identifier { get; set; }

    [JsonPropertyName("additionalProperties")]
    public List<Properties>? AdditionalProperties { get; set; }

}

public sealed class Properties
{
    [JsonPropertyName("property")]
    public string? Property { get; init; }

    [JsonPropertyName("value")]
    public JsonElement Value { get; init; }

    public string? GetFirstString()
    {
        if (Value.GetArrayLength() == 0)
            throw new InvalidOperationException($"Property '{Property}' had an empty value array.");

        return Value[0].GetString();
    }
}

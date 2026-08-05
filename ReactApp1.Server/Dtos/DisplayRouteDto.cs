using Newtonsoft.Json;

namespace ReactApp1.Server.Dtos;

public sealed class DisplayRouteDto
{
    [JsonProperty("name")]
    public string Name { get; set; }

    [JsonProperty("duration")]
    public double Duration { get; set; }

    [JsonProperty("distance")]
    public double Distance { get; set; }
}
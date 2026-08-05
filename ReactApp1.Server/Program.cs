using Azure.Identity;
using Geo.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;
using  NetTopologySuite;
using NetTopologySuite.IO.Converters;
using ReactApp1.Server.Infrastructure.Http;
using ReactApp1.Server.Models;
using StackExchange.Redis;
using System.Collections.Immutable;
using System.Runtime.Intrinsics;
using System.Text.Json.Serialization;
using static NetTopologySuite.Geometries.Utilities.GeometryMapper;

var opts = new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
    WebRootPath = "wwwroot"
};
var builder = WebApplication.CreateBuilder(opts);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.CustomSchemaIds(type => type.FullName!
        .Replace("+", ".")
        .Replace("`", "_"));
});

var connString = builder.Configuration.GetConnectionString("DefaultConnection")
                 ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not configured.");

Console.WriteLine($"[DEBUG] Using connection string: {connString}");

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(connString, o =>
    {
        o.UseNetTopologySuite();
        o.EnableRetryOnFailure();
    });

    options.EnableDetailedErrors();
    options.EnableSensitiveDataLogging();
    options.LogTo(Console.WriteLine);

});

builder.Services.Configure<MapBoxOptions>(
    builder.Configuration.GetSection("Mapbox"));
builder.Services.AddTransient<MapBoxDirections>();


builder.Services.AddHttpClient<IDirectionsService, DirectionsService>(client =>
{
    client.BaseAddress = new Uri("https://api.mapbox.com/directions/v5/mapbox/driving-traffic/");
});

builder.Services.AddHttpClient<IOutageService,OutageService>(client =>
{
    client.BaseAddress = new Uri("https://centerpoint.datacapable.com/datacapable/v2/p/centerpoint/r/texas/map/events");
});

string connectionString = builder.Configuration.GetConnectionString("Redis");

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = connectionString;
});


var mapboxSecret = builder.Configuration["Mapbox"];

MapboxOptions token = new();

builder.Services.AddOptions<MapboxOptions>()
    .Bind(builder.Configuration)
    .Validate(options => !string.IsNullOrEmpty(options.MapboxToken), "MapboxToken is missing from configuration!")
    .ValidateOnStart();

builder.Services.AddHttpClient("Mapbox", httpClient =>
{
    httpClient.BaseAddress = new Uri("https://api.mapbox.com");
    httpClient.DefaultRequestHeaders.Accept.ParseAdd("application/json");
})
    .AddHttpMessageHandler<MapBoxDirections>();

builder.Services.AddMapBoxGeocoding()
    .AddKey("Mapbox");

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new NetTopologySuite.IO.Converters.GeoJsonConverterFactory());
    o.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals;
    o.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.DisplayRequestDuration();
    });

    app.UseDeveloperExceptionPage();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();

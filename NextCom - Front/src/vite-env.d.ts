/// <reference types="vite/client" />
declare module 'world-atlas/countries-110m.json' {
  const topology: import('topojson-specification').Topology<{
    countries: import('topojson-specification').GeometryCollection<{ name: string }>
  }>
  export default topology
}

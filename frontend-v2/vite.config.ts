import {defineConfig} from 'vite';
import {svelte} from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base:'./',
  plugins:[svelte()],
  build:{outDir:'dist',emptyOutDir:true,sourcemap:false},
  server:{port:4174,strictPort:true}
});

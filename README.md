# Description
This WebGPU sample evaluate quadtree on compute shader and draw resulting nodes using indirect dispatch and indirect draw.
It's based on the paper ‘‘Quadtrees on the GPU’’  from Jonathan Dupuy, Jean-Claude Iehl, and Pierre Poulin.
The idea is to evaluate the quadtree in the compute shader and display it directly using indirect draw call, so it means no CPU computation at all. Buffers used to evaluate the quadtree are switched every frame (result at a frame n will be used as source at the frame n+1).

# Encoding Node

* A node is encoded with uint 32 bits
* 2 bits are used to encode a quad in node
```
 ---------
| 00 | 01 |
|----+----|
| 01 | 11 |
 ---------
```

* The first leading bit is used to start the node information and define the level of the node

```
00000100 11000000 00000000 00001001
     ^—- -------- -------- -------- first leading bit
```

So level = firstLeadingBit (26) >> 1 (remember 2 bits are used to encode the quad in the node and we need one to locate the level of a node)
```
Some node example (x,y,size) size is 1.0/level
0x00000100 -> (0.0,  0.0,  0.5)
0x00000101 -> (0.5,  0.0,  0.5)
0x00000110 -> (0.0,  0.5,  0.5)
0x00000111 -> (0.5,  0.5,  0.5)
0x00010011 -> (0.25, 0.25, 0.25)
0x00010000 -> (0.0,  0.0,  0.25)
```



## links
http://vterrain.org/LOD/Implementations/
https://jadkhoury.github.io/files/MasterThesisFinal.pdf

## Install
```
npm install
npx parcel
```



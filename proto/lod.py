import math

quads = [ [0,0] ,
          [0,1] ,
          [1,1] ,
          [1,0]
    ]

# this is the equivalent of webgpu function
# https://gpuweb.github.io/gpuweb/wgsl/#firstLeadingBit-unsigned-builtin
# this a function that helps to get the first bit to compute the level of quad
def firstLeadingBit( n ):
    if n == 0:
        return -1

    ndx = 0
    while ( 1 < n ):
        n = ( n >> 1 )
        ndx += 1

    return ndx

def create_coord(key_tupple):
    size = 1.0 / (1 << int(key_tupple[0]))
    x = key_tupple[1] * size
    y = key_tupple[2] * size
    return (x,y, size)



#  -------
# | 0 | 1 |
#  -------
# | 2 | 3 |
#  -------

def undilate(x):
    x = ( x | ( x >> 1)) & 0x33333333
    x = ( x | ( x >> 2)) & 0x0f0f0f0f
    x = ( x | ( x >> 4)) & 0x00ff00ff
    x = ( x | ( x >> 8)) & 0x0000ffff
    return x & 0x0000ffff

# functions with 16 are the technics with the bit to start the node encoding
# this is this version I am interested by.
#
# ---- ---- ---- ---- ---- ---- 0111 0000
#                                ^ leading bit to start encoding
#
# '0b01 11 10 01'      -> 121 in the format with leading bit to start encoding
#     -

def get_level(key):
    leading_bit = firstLeadingBit(key)
    return leading_bit >> 1

def decode(key):
    leading_bit = firstLeadingBit(key)
    level = leading_bit >> 1
    # remove level bit
    k = ~(1 << leading_bit)
    k = k & key
    x = undilate( k & 0x55555555)
    y = undilate( (k >> 1) & 0x55555555)
    return (level, x , y)

def children(key):
    children = [0 ,0 ,0 ,0]
    k = key << 2
    children [0] = k
    children [1] = k | 0x1
    children [2] = k | 0x2
    children [3] = k | 0x3
    return children

def get_parent(key):
    return key >> 2

def test_16():
    print("test 16-------------")
    key = 1
    depth = 0
    while depth < 15:
        children = children(key)
        for child in children:
            if get_parent(child) != key:
                print("something wrong with key {} and parent {}".format(child, key))
                break
        infos = decode(key)
        coords = create_coord(infos)
        print("level {} key {} : {},{} scale {}".format(infos[0], key, coords[0], coords[1], coords[2]))
        depth+=1

        # select not always the same children
        key = children[depth%4]

def print_node(node):
    coords = get_coord(node)
    center = get_node_center(node)
    print("level {} key {} : [ {}, {} ] size {} : center [ {}, {} ]".format(get_level(node), node, coords[0], coords[1], coords[2], center[0], center[1]))

def distance(a,b):
    c0 = a[0] - b[0]
    c1 = a[1] - b[1]
    return math.sqrt(c0 * c0 + c1 * c1)

def get_coord(node):
    return create_coord(decode(node))

def get_node_size(node):
    return create_coord(decode(node))[2]

def get_node_center(node):
    coord = create_coord(decode(node))
    return [ coord[0] + coord[2] * 0.5, coord[1] + coord[2] * 0.5]

def scale_factor(z):
    # s(z) = 2z tan ( α / 2 )
    x = (3.14159265359 * 0.5)
    c = 2.0 * math.tan( x * 0.5 )
    # c = 2
    return z * c

def get_distance_from_level(level, max_level, k):
    size = 0.0

    for i in range(0,max_level-level-1):
        quadSize = 1.0/float(1 << (max_level-i))
        size += k * quadSize

    print("distance {} for level {} with k = {}, max level = {}".format(size, level, k, max_level))
    return size


def evaluate_tree(node, pos):
    k = 4

    print("position {} {}".format(pos[0], pos[1]))

    node_size = get_node_size(node)
    node_factor = scale_factor(distance(get_node_center(node), pos))

    parent = get_parent(node)
    parent_size = get_node_size(parent)
    parent_factor = scale_factor(distance(get_node_center(parent), pos))

    print_node(node)
    print_node(parent)


    print("currentNode : k*node_size   {} : node_factor   {}".format(k*node_size, node_factor))

    # the important part for the morphing is this part because it's the one that evaluate
    # when we switch on the lower resolution
    # so when the condition k*parent_size < parent_factor then it merges
    print("parentNode  : k*parent_size {} : parent_factor {}".format(k*parent_size, parent_factor))


def testLodBehaviour():
    root_node = 1

    position = (0.5, 0.5)

    children0 = children(root_node)
    evaluate_tree(children0[0], position)

    get_distance_from_level(1, 6, 4)
    get_distance_from_level(1, 4, 2)


    # let nodeCoord = getQuadCoord(node);
    # let nodeSize = nodeCoord.z;
    # let nodeCenter = nodeCoord.xy * vec2<f32>(nodeSize) + vec2<f32>(nodeSize * 0.5);

    # let parentCoord = getQuadCoord(parent);
    # let parentSize = parentCoord.z;
    # let parentCenter = parentCoord.xy * vec2<f32>(parentSize) + vec2<f32>(parentSize * 0.5);

def compute_S_and_D(level, distance):
    max_level = 4
    k = 8.0
    s = 2.0
    node_size = 1.0/(1<<level)
    knode = k * node_size

    sdist = s * distance

    parent_size = 1.0/(1<<(level-1))
    kparent = k * parent_size
    print("distance: {} : S {} : level {}".format(distance, sdist, level))
    print("knode   : {} : node   size {}".format(knode, node_size))
    print("kparent : {} : parent size {}".format(kparent, parent_size))

    factor = sdist/kparent
    print("kparent/S = {} : {}".format(factor, 2.5*(factor - 0.5)))
    print("---------------------")


def main():

    compute_S_and_D(4, 2*1.0/16)
    compute_S_and_D(4, 4*1.0/16)
    compute_S_and_D(4, 5*1.0/16)
    compute_S_and_D(4, 6*1.0/16)
    compute_S_and_D(4, 7*1.0/16)

    compute_S_and_D(4, 8*1.0/16)
    compute_S_and_D(3, 8*1.0/16)

#    for i in range(0,20, 2):
#        compute_S_and_D(4, (6+i/10.0)*1.0/16)

    # for i in range(0,20, 2):
    #     compute_S_and_D(3, (8+i/10.0)*1.0/16)
    #testLodBehaviour()
    return

    print("distance 1: {}".format(scaleFactor(1)))
    print("distance 0: {}".format(scaleFactor(0)))
    print("distance 0.5: {}".format(scaleFactor(0.5)))


    for i in range(0, 10, 1):
        print("lod distance {}:   {}".format(i/10.0, selectLod(i/10.0)))

    return

    test_16()
    return

    # '0b01 11 10 01' -> 121
    # (0.625, 0.75, 0.125)
    print("firstLeadingBit(121) = {}".format(firstLeadingBit(121)))
    tupple = decode(121)
    print( create_coord(tupple) )
    # (0.0, 0.0, 1.0)

if __name__ == "__main__":
    main()
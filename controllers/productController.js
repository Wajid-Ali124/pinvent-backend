const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const { fileSizeFormatter } = require("../utils/fileUpload");
const path = require("path")
const cloudinary = require("cloudinary").v2;

//Create Product
const createProduct = asyncHandler(async (req, res) => {
    const { name, sku, category, quantity, price, description } = req.body

    //Validation
    if (!name || !category || !quantity || !price || !description) {
        res.status(400)
        throw new Error("Please fill all fields")
    }

    //Handle Image
    let fileData = {}
    if (req.file) {
        try {
            // Save image to Cloudinary
            const uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "Pinvent",
                resource_type: "image"
            })

            // Set fileData object properties
            fileData = {
                fileName: req.file.originalname,
                filePath: uploadedFile.secure_url,
                fileType: req.file.mimetype,
                fileSize: fileSizeFormatter(req.file.size, 2),
                public_id: uploadedFile.public_id // Set public_id property
            }

        } catch (error) {
            res.status(500)
            throw new Error("Image could not be uploaded")
        }
    }

    // Create Product
    const product = await Product.create({
        user: req.user.id,
        name,
        sku,
        category,
        quantity,
        price,
        description,
        image: fileData
    })

    res.status(201).json(product)
})



//Get all Products
const getProducts = asyncHandler(async (req, res) => {
    const products = await Product.find({ user: req.user.id }).sort("-createdAt")
    res.status(200).json(products)
})

//Get a Single Products
const getProduct = asyncHandler(async (req, res) => {
    //find product by id
    const product = await Product.findById(req.params.id)

    //Check if Product exists
    if (!product) {
        res.status(404)
        throw new Error("Product not found")
    }

    //Match the product to its user
    if (product.user.toString() !== req.user.id) {
        res.status(401)
        throw new Error("User not authorized")
    }

    res.status(200).json(product)
})




//Delete a  Single Product
const deleteProduct = asyncHandler(async (req, res) => {
    //find product by id
    const product = await Product.findById(req.params.id)

    //Check if Product is available
    if (!product) {
        res.status(404)
        throw new Error("Product not found")
    }

    //Match the product to its user
    if (product.user.toString() !== req.user.id) {
        res.status(401)
        throw new Error("User not authorized")
    }

    // Delete the product image from Cloudinary
    if (product.image && product.image.public_id) {
        try {
            await cloudinary.uploader.destroy(product.image.public_id)
        } catch (error) {
            res.status(500)
            throw new Error("Error deleting product image from Cloudinary")
        }
    }

    // Delete the product from the database
    await product.deleteOne()

    res.status(200).json({ message: "Product Deleted Successfully" })
})


//Delete All Products at once
const deleteAllProducts = asyncHandler(async (req, res) => {

    // Get all products created by the currently signed-in user
    const products = await Product.find({ user: req.user.id })

    // Delete all products from Mongo and their images from Cloudinary
    for (const product of products) {
        if (product.image.public_id) {
            await cloudinary.uploader.destroy(product.image.public_id)
        }
        await product.deleteOne()
    }

    res.status(200).json({ message: "All Products Deleted Successfully" })

})



//Update Product
const updateProduct = asyncHandler(async (req, res) => {
    const { name, category, quantity, price, description } = req.body
    const { id } = req.params

    const product = await Product.findById(id)


    //Check if Product exists
    if (!product) {
        res.status(404)
        throw new Error("Product not found")
    }

    //Match the product to its user
    if (product.user.toString() !== req.user.id) {
        res.status(401)
        throw new Error("User not authorized")
    }

    //Handle Image
    let fileData = {}
    if (req.file) {

        // Delete the product image from Cloudinary
        if (product.image && product.image.public_id) {
            try {
                await cloudinary.uploader.destroy(product.image.public_id)
            } catch (error) {
                res.status(500)
                throw new Error("Error deleting product image from Cloudinary")
            }
        }

        //Save New Image
        try {
            // Save image to Cloudinary
            const uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "Pinvent",
                resource_type: "image"
            })

            // Set fileData object properties
            fileData = {
                fileName: req.file.originalname,
                filePath: uploadedFile.secure_url,
                fileType: req.file.mimetype,
                fileSize: fileSizeFormatter(req.file.size, 2),
                public_id: uploadedFile.public_id // Set public_id property
            }
        } catch (error) {
            res.status(500)
            throw new Error("Image could not be uploaded")
        }
    }


    // Update Product
    const updatedProduct = await Product.findByIdAndUpdate(
        { _id: id },
        {
            name,
            category,
            quantity,
            price,
            description,
            image: Object.keys(fileData).length === 0 ? product?.image : fileData,
        },
        {
            new: true,
            runValidators: true,
        }
    )

    res.status(200).json(updatedProduct)
})

module.exports = {
    createProduct,
    getProducts,
    getProduct,
    deleteProduct,
    updateProduct,
}
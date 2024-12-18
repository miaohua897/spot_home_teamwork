const express = require("express");
const router = express.Router();
const { ReviewImage, Review } = require('../../db/models')
const { requireAuth } = require('../../utils/auth.js')


//Delete a Review Image
router.delete('/:id', requireAuth, async(req, res, next)=>{
    const reviewImg = await ReviewImage.findByPk(req.params.id);
    if(!reviewImg){
        return res.status(404).json({
            message: "Review Image couldn't be found"
        });
    };
    const review = await Review.findByPk(reviewImg.reviewId);
    const { user } = req;
    const data = user.dataValues;
    const userId = data.id;
   
    // Authorization
   if(`${review.userId}` !== `${userId}`){
        return res.status(403).json({
            message: "User not authorized"
        });
    };


    await reviewImg.destroy()

    return res.status(200).json({
        message: "Successfully deleted"
    });
});


module.exports = router
import mongoose, { Document, Model } from 'mongoose';
export interface ICategory extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    image?: string;
    parentCategory?: mongoose.Types.ObjectId;
    isActive: boolean;
    order: number;
    metadata?: {
        keywords?: string[];
        seoTitle?: string;
        seoDescription?: string;
    };
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const Category: Model<ICategory>;
export default Category;
//# sourceMappingURL=Category.d.ts.map